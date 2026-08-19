import { db } from '../../../config/database';

const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;
type Month = typeof MONTHS[number];

// ==========================================
// 1. REVENUE & DIRECT EXPENSES INTEGRATION
// ==========================================
export const fetchRevenueDirectExpenses = async (year: string) => {
  const [manualRows]: any = await db.query(
    'SELECT * FROM actual_revenue_direct_expenses WHERE financial_year = ?',
    [year]
  );

  const groupedData: Record<string, any> = {};

  // Load manual revenue and direct_expense_pct
  manualRows.forEach((row: any) => {
    const groupKey = `${row.customer}-${row.project}-${row.location}`;
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        customer: row.customer,
        project: row.project || '-',
        location: row.location || '-',
        year: year,
        revenueMonths: {},
        directExpensePctMonths: {}
      };
    }
    groupedData[groupKey].revenueMonths[row.month] = parseFloat(row.revenue) || 0;
    groupedData[groupKey].directExpensePctMonths[row.month] = parseFloat(row.direct_expense_pct) || 0;
  });

  // Load live revenue from customer_invoices (overrides or adds to manual if present)
  const liveQuery = `
    SELECT 
      ci.customer_name as customer,
      COALESCE(NULLIF(TRIM(ci.project), ''), '-') as project,
      COALESCE(NULLIF(TRIM(ci.location), ''), '-') as location,
      MONTH(ci.date) as invoice_month,
      SUM(ci.amount) as revenue
    FROM customer_invoices ci
    WHERE ci.financial_year = ?
    GROUP BY ci.customer_name, ci.project, ci.location, MONTH(ci.date)
  `;
  
  const [liveRows]: any = await db.query(liveQuery, [year]);
  
  const monthMap: Record<number, string> = {
    4: 'apr', 5: 'may', 6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec',
    1: 'jan', 2: 'feb', 3: 'mar'
  };

  liveRows.forEach((row: any) => {
    const proj = row.project || '-';
    const loc = row.location || '-';
    const groupKey = `${row.customer}-${proj}-${loc}`;
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        customer: row.customer,
        project: proj,
        location: loc,
        year: year,
        revenueMonths: {},
        directExpensePctMonths: {}
      };
    }
    
    const mStr = monthMap[row.invoice_month];
    if (mStr) {
      groupedData[groupKey].revenueMonths[mStr] = parseFloat(row.revenue);
    }
  });

  return Object.values(groupedData);
};

export const upsertRevenueDirectExpenses = async (year: string, groups: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let totalRevenue = 0;
    let totalDirectExpense = 0;

    // 1. Get incoming keys
    const incomingKeys = new Set(groups.map(g => `${g.customer}|||${g.project}|||${g.location}`));

    // 2. Fetch existing groups in DB for this year
    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT customer, project, location FROM actual_revenue_direct_expenses WHERE financial_year = ?',
      [year]
    );

    // 3. Delete groups that are no longer present in incoming data
    for (const row of existingRows) {
      const key = `${row.customer}|||${row.project}|||${row.location}`;
      if (!incomingKeys.has(key)) {
        await connection.query(
          `DELETE FROM actual_revenue_direct_expenses WHERE financial_year = ? AND customer = ? AND project = ? AND location = ?`,
          [year, row.customer, row.project, row.location]
        );
      }
    }

    // 4. Insert or Update incoming groups
    const monthlyTotals: Record<Month, { revenue: number, directExpenses: number }> = {} as any;
    for (const m of MONTHS) {
      monthlyTotals[m] = { revenue: 0, directExpenses: 0 };
    }

    for (const group of groups) {
      const { customer, project, location } = group;

      let groupTotalRevenue = 0;
      let groupTotalDirectExpense = 0;

      for (const month of MONTHS) {
        const revenue = group.revenueMonths?.[month] || 0.00;
        const pct = group.directExpensePctMonths?.[month] || 0.00;

        await connection.query(
          `INSERT INTO actual_revenue_direct_expenses 
            (financial_year, customer, project, location, month, revenue, direct_expense_pct) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE revenue = VALUES(revenue), direct_expense_pct = VALUES(direct_expense_pct)`,
          [year, customer, project, location, month, revenue, pct]
        );
        groupTotalRevenue += revenue;
        groupTotalDirectExpense += (revenue * pct) / 100;

        monthlyTotals[month].revenue += revenue;
        monthlyTotals[month].directExpenses += (revenue * pct) / 100;
      }

      totalRevenue += groupTotalRevenue;
      totalDirectExpense += groupTotalDirectExpense;
    }

    // Save Monthly Totals to the new table
    for (const month of MONTHS) {
      const rev = monthlyTotals[month].revenue;
      const de = monthlyTotals[month].directExpenses;
      const gm = rev - de;
      const dePct = rev > 0 ? (de / rev) * 100 : 0;
      const gmPct = rev > 0 ? (gm / rev) * 100 : 0;

      await connection.query(
        `INSERT INTO actual_revenue_direct_expenses_totals 
          (financial_year, month, revenue, direct_expenses, gross_margin, direct_expense_pct, gross_margin_pct) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          revenue = VALUES(revenue), 
          direct_expenses = VALUES(direct_expenses), 
          gross_margin = VALUES(gross_margin), 
          direct_expense_pct = VALUES(direct_expense_pct), 
          gross_margin_pct = VALUES(gross_margin_pct)`,
        [year, month, rev, de, gm, dePct, gmPct]
      );
    }

    // Save totals for Revenue Direct Expenses
    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'RevenueDirectExpense', 'Total Revenue', totalRevenue]
    );
    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'RevenueDirectExpense', 'Total Direct Expenses', totalDirectExpense]
    );

    await connection.commit();
    return { message: 'Revenue and Direct Expenses saved successfully' };
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ==========================================
// 2. CORPORATE EXPENSES INTEGRATION
// ==========================================
export const fetchCorporateExpenses = async (year: string) => {
  const [startYearStr, endYearStr] = year.split('-');
  const startYear = parseInt(startYearStr);
  const endYear = parseInt(endYearStr);

  const [rows]: any = await db.query(
    'SELECT * FROM actual_corporate_expenses WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  
  // 1. Load manual heads
  rows.forEach((row: any) => {
    if (!grouped[row.head]) {
      grouped[row.head] = { head: row.head, year: row.financial_year };
    }
    grouped[row.head][row.month] = parseFloat(row.amount);
  });

  // 2. Load live HRMS corporate expenses
  const liveQuery = `
    SELECT 
      c.name as head,
      MONTH(r.updated_at) as expense_month,
      SUM(r.amount) as amount
    FROM hrms_expense_requests r
    JOIN hrms_expense_categories c ON r.expense_category_id = c.id
    WHERE r.status = 'Approved'
      AND ( (YEAR(r.updated_at) = ? AND MONTH(r.updated_at) >= 4) OR (YEAR(r.updated_at) = ? AND MONTH(r.updated_at) <= 3) )
    GROUP BY c.name, expense_month
  `;
  const [hrmsRows]: any = await db.query(liveQuery, [startYear, endYear]);

  const monthMap: Record<number, string> = {
    4: 'apr', 5: 'may', 6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec',
    1: 'jan', 2: 'feb', 3: 'mar'
  };

  hrmsRows.forEach((row: any) => {
    const headName = `${row.head} (HRMS)`;
    if (!grouped[headName]) {
      grouped[headName] = { head: headName, year: year };
    }
    const mStr = monthMap[row.expense_month];
    if (mStr) {
      grouped[headName][mStr] = parseFloat(row.amount);
    }
  });

  return Object.values(grouped);
};

export const upsertCorporateExpenses = async (year: string, data: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let moduleTotal = 0;

    // 1. Get incoming heads
    const incomingHeads = new Set(data.map(row => row.head));

    // 2. Fetch existing heads in DB for this year
    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT head FROM actual_corporate_expenses WHERE financial_year = ?',
      [year]
    );

    // 3. Delete heads that are no longer present in incoming data (ignore HRMS rows)
    for (const row of existingRows) {
      if (!incomingHeads.has(row.head) && !row.head.endsWith('(HRMS)')) {
        await connection.query(
          `DELETE FROM actual_corporate_expenses WHERE financial_year = ? AND head = ?`,
          [year, row.head]
        );
      }
    }

    // 4. Insert or Update incoming heads
    for (const row of data) {
      let headTotal = 0;
      
      const isHrms = row.head.endsWith('(HRMS)');

      for (const month of MONTHS) {
        const amount = row[month] || 0.00;

        if (!isHrms) {
          await connection.query(
            `INSERT INTO actual_corporate_expenses (financial_year, head, month, amount)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
            [year, row.head, month, amount]
          );
        }
        headTotal += amount;
        moduleTotal += amount;
      }

      // Save individual head total
      await connection.query(
        `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'CorporateExpenses', row.head, headTotal]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'CorporateExpenses', 'Grand Total', moduleTotal]
    );

    await connection.commit();
    return { message: 'Corporate expenses saved successfully' };
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ==========================================
// 3. SALARY INTEGRATION
// ==========================================
export const fetchSalaries = async (year: string) => {
  const [startYearStr, endYearStr] = year.split('-');
  const startYear = parseInt(startYearStr);
  const endYear = parseInt(endYearStr);

  const [manualRows]: any = await db.query(
    'SELECT * FROM actual_salaries WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  manualRows.forEach((row: any) => {
    const key = `${row.head}-${row.customer}-${row.project}-${row.location}-${row.designation}-${row.name_of_employee}`;
    if (!grouped[key]) {
      grouped[key] = {
        head: row.head,
        customer: row.customer,
        project: row.project,
        location: row.location,
        designation: row.designation,
        nameOfEmployee: row.name_of_employee,
        year: row.financial_year
      };
    }
    grouped[key][row.month] = parseFloat(row.amount);
  });

  const query = `
    SELECT 
      e.id as emp_id,
      CONCAT(e.first_name, ' ', e.last_name) as name_of_employee,
      p.month,
      p.year as cal_year,
      p.gross_salary as amount
    FROM hrms_payslips p
    JOIN hrms_employees e ON p.employee_id = e.id
    WHERE (p.year = ? AND p.month >= 4) OR (p.year = ? AND p.month <= 3)
  `;
  const [hrmsRows]: any = await db.query(query, [startYear, endYear]);

  const monthMap: Record<number, string> = {
    4: 'apr', 5: 'may', 6: 'jun', 7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec',
    1: 'jan', 2: 'feb', 3: 'mar'
  };

  hrmsRows.forEach((row: any) => {
    const key = `HRMS-Salary-${row.emp_id}`;
    if (!grouped[key]) {
      grouped[key] = {
        head: 'Gross Salary (HRMS)',
        customer: '-',
        project: '-',
        location: '-',
        designation: '-',
        nameOfEmployee: row.name_of_employee,
        year: year
      };
    }
    const mStr = monthMap[row.month];
    if (mStr) {
      grouped[key][mStr] = parseFloat(row.amount);
    }
  });

  return Object.values(grouped);
};

export const upsertSalaries = async (year: string, data: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let moduleTotal = 0;
    const headTotals: Record<string, number> = {};

    // 1. Get incoming keys
    const incomingKeys = new Set(data.map(row => `${row.head}|||${row.customer}|||${row.project}|||${row.location}|||${row.designation}|||${row.nameOfEmployee}`));

    // 2. Fetch existing salaries in DB for this year
    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT head, customer, project, location, designation, name_of_employee FROM actual_salaries WHERE financial_year = ?',
      [year]
    );

    // 3. Delete salaries that are no longer present in incoming data
    for (const row of existingRows) {
      const key = `${row.head}|||${row.customer}|||${row.project}|||${row.location}|||${row.designation}|||${row.name_of_employee}`;
      if (!incomingKeys.has(key)) {
        await connection.query(
          `DELETE FROM actual_salaries WHERE financial_year = ? AND head = ? AND customer = ? AND project = ? AND location = ? AND designation = ? AND name_of_employee = ?`,
          [year, row.head, row.customer, row.project, row.location, row.designation, row.name_of_employee]
        );
      }
    }

    // 4. Insert or Update incoming salaries
    for (const row of data) {
      if (!headTotals[row.head]) headTotals[row.head] = 0;

      for (const month of MONTHS) {
        const amount = row[month] || 0.00;

        await connection.query(
          `INSERT INTO actual_salaries (financial_year, head, customer, project, location, designation, name_of_employee, month, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
          [year, row.head, row.customer, row.project, row.location, row.designation, row.nameOfEmployee, month, amount]
        );
        headTotals[row.head] += amount;
        moduleTotal += amount;
      }
    }

    // Save individual head totals
    for (const [head, total] of Object.entries(headTotals)) {
      await connection.query(
        `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'Salaries', head, total]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'Salaries', 'Grand Total', moduleTotal]
    );

    await connection.commit();
    return { message: 'Salaries saved successfully' };
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ==========================================
// 4. BANK CHARGES INTEGRATION
// ==========================================
export const fetchBankCharges = async (year: string) => {
  const [rows]: any = await db.query(
    'SELECT * FROM actual_bank_charges WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  rows.forEach((row: any) => {
    if (!grouped[row.head]) {
      grouped[row.head] = { head: row.head, year: row.financial_year };
    }
    grouped[row.head][row.month] = parseFloat(row.amount);
  });

  return Object.values(grouped);
};

export const upsertBankCharges = async (year: string, data: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let moduleTotal = 0;

    // 1. Get incoming heads
    const incomingHeads = new Set(data.map(row => row.head));

    // 2. Fetch existing heads in DB for this year
    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT head FROM actual_bank_charges WHERE financial_year = ?',
      [year]
    );

    // 3. Delete heads that are no longer present in incoming data
    for (const row of existingRows) {
      if (!incomingHeads.has(row.head)) {
        await connection.query(
          `DELETE FROM actual_bank_charges WHERE financial_year = ? AND head = ?`,
          [year, row.head]
        );
      }
    }

    // 4. Insert or Update incoming heads
    for (const row of data) {
      let headTotal = 0;

      for (const month of MONTHS) {
        const amount = row[month] || 0.00;

        await connection.query(
          `INSERT INTO actual_bank_charges (financial_year, head, month, amount)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
          [year, row.head, month, amount]
        );
        headTotal += amount;
        moduleTotal += amount;
      }

      // Save individual head total
      await connection.query(
        `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'BankCharges', row.head, headTotal]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'BankCharges', 'Grand Total', moduleTotal]
    );

    await connection.commit();
    return { message: 'Bank Charges saved successfully' };
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ==========================================
// 5. SUMMARY CONSOLIDATION & CALCULATIONS
// ==========================================
export const fetchSummary = async (year: string) => {
  // 1. Fetch Revenue & Pct
  const revExpRows: any = await fetchRevenueDirectExpenses(year);

  // 2. Fetch Corporate Expenses
  const corpRows: any = await fetchCorporateExpenses(year);

  // 3. Fetch Bank Charges
  const bankRows: any = await fetchBankCharges(year);

  // 4. Fetch Depreciation/Tax manual inputs
  const [summaryInputRows]: any = await db.query(
    'SELECT month, depreciation, income_tax FROM actual_summary_inputs WHERE financial_year = ?',
    [year]
  );



  // Initialize month calculation structure
  const monthlySummary: Record<Month, Record<string, number>> = {} as any;
  MONTHS.forEach(m => {
    monthlySummary[m] = {
      revenue: 0,
      directExpenses: 0,
      corporateExpenses: 0,
      bankInterest: 0,
      depreciation: 0,
      incomeTax: 0
    };
  });

  // Populate calculations
  revExpRows.forEach((r: any) => {
    MONTHS.forEach(m => {
      const rev = parseFloat(r.revenueMonths?.[m]) || 0;
      const pct = parseFloat(r.directExpensePctMonths?.[m]) || 0;
      monthlySummary[m].revenue += rev;
      monthlySummary[m].directExpenses += (rev * pct) / 100;
    });
  });

  corpRows.forEach((r: any) => {
    MONTHS.forEach(m => {
      monthlySummary[m].corporateExpenses += parseFloat(r[m]) || 0;
    });
  });

  bankRows.forEach((r: any) => {
    MONTHS.forEach(m => {
      monthlySummary[m].bankInterest += parseFloat(r[m]) || 0;
    });
  });

  summaryInputRows.forEach((r: any) => {
    const m = r.month as Month;
    monthlySummary[m].incomeTax += parseFloat(r.income_tax) || 0;
  });

  // 4. Fetch Depreciation (includes manual entries + HRMS live assets)
  const depRows: any = await fetchDepreciation(year);

  depRows.forEach((row: any) => {
    MONTHS.forEach(m => {
      if (monthlySummary[m]) {
        monthlySummary[m].depreciation += parseFloat(row[m]) || 0;
      }
    });
  });

  // Apply calculated income tax to all months
  MONTHS.forEach(m => {
    const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses - monthlySummary[m].bankInterest;
    monthlySummary[m].incomeTax = (ebita - monthlySummary[m].depreciation) * 0.26;
  });

  // Consolidate row values dynamically matching frontend rules
  const resultRows = {
    'Revenue': MONTHS.map(m => monthlySummary[m].revenue),
    'Direct Expenses': MONTHS.map(m => monthlySummary[m].directExpenses),
    'Gross Margin': MONTHS.map(m => monthlySummary[m].revenue - monthlySummary[m].directExpenses),
    'Gross Margin %Age': MONTHS.map(m => {
      const rev = monthlySummary[m].revenue;
      return rev > 0 ? ((rev - monthlySummary[m].directExpenses) / rev) * 100 : 0;
    }),
    'Total Corporate Expenses': MONTHS.map(m => monthlySummary[m].corporateExpenses),
    'Corporate Expenses % Age': MONTHS.map(m => {
      const rev = monthlySummary[m].revenue;
      return rev > 0 ? (monthlySummary[m].corporateExpenses / rev) * 100 : 0;
    }),
    'Total Bank Interest / Expenses': MONTHS.map(m => monthlySummary[m].bankInterest),
    'Total Bank Interest / Expenses % Age': MONTHS.map(m => {
      const rev = monthlySummary[m].revenue;
      return rev > 0 ? (monthlySummary[m].bankInterest / rev) * 100 : 0;
    }),
    'EBITA': MONTHS.map(m => {
      const gm = monthlySummary[m].revenue - monthlySummary[m].directExpenses;
      return gm - monthlySummary[m].corporateExpenses - monthlySummary[m].bankInterest;
    }),
    'EBITA %Age': MONTHS.map(m => {
      const rev = monthlySummary[m].revenue;
      const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses - monthlySummary[m].bankInterest;
      return rev > 0 ? (ebita / rev) * 100 : 0;
    }),
    'Deprication': MONTHS.map(m => monthlySummary[m].depreciation),
    'Income Tax': MONTHS.map(m => monthlySummary[m].incomeTax),
    'NP': MONTHS.map(m => {
      const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses - monthlySummary[m].bankInterest;
      return ebita - monthlySummary[m].depreciation - monthlySummary[m].incomeTax;
    }),
    'NP % Age': MONTHS.map(m => {
      const rev = monthlySummary[m].revenue;
      const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses - monthlySummary[m].bankInterest;
      const np = ebita - monthlySummary[m].depreciation - monthlySummary[m].incomeTax;
      return rev > 0 ? (np / rev) * 100 : 0;
    })
  };

  return resultRows;
};

// ==========================================
// 6. DEPRECIATION INTEGRATION
// ==========================================
export const fetchDepreciation = async (year: string) => {
  const [rows]: any = await db.query(
    'SELECT * FROM actual_depreciation WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  rows.forEach((row: any) => {
    const key = `${row.category}-${row.asset_name}`;
    if (!grouped[key]) {
      grouped[key] = {
        category: row.category,
        assetName: row.asset_name,
        depPercentage: parseFloat(row.dep_percentage),
        purchaseDate: row.purchase_date,
        purchaseValue: parseFloat(row.purchase_value),
        openingDate: row.opening_date,
        wdvOpeningValue: parseFloat(row.wdv_opening_value),
        year: row.financial_year
      };
    }
    grouped[key][row.year_name] = parseFloat(row.amount);
  });

  // HRMS Assets integration
  const [hrmsRows]: any = await db.query(
    'SELECT * FROM hrms_assets WHERE is_active = 1'
  );

  const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

  hrmsRows.forEach((asset: any) => {
    const assetName = `${asset.name} (HRMS)`;
    const key = `${asset.category}-${assetName}`;
    const pDate = new Date(asset.purchase_date);
    const pValue = parseFloat(asset.purchase_price) || 0;
    const depRate = parseFloat(asset.depreciation_rate) || 0;

    if (!grouped[key]) {
      grouped[key] = {
        category: asset.category || 'Other',
        assetName: assetName,
        depPercentage: depRate,
        purchaseDate: pDate.toISOString().split('T')[0],
        purchaseValue: pValue,
        openingDate: pDate.toISOString().split('T')[0],
        wdvOpeningValue: pValue,
        year: year
      };
    }
    
    const rate = depRate / 100;
    const annualDep = pValue * rate;
    const monthlyDep = annualDep / 12;

    MONTHS.forEach((m) => {
      grouped[key][m] = Math.round(monthlyDep);
    });
  });

  return Object.values(grouped);
};

export const upsertDepreciation = async (year: string, data: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let moduleTotal = 0;

    const incomingKeys = new Set(data.map(row => `${row.category}|||${row.assetName}`));

    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT category, asset_name FROM actual_depreciation WHERE financial_year = ?',
      [year]
    );

    for (const row of existingRows) {
      const key = `${row.category}|||${row.asset_name}`;
      if (!incomingKeys.has(key) && !row.asset_name.endsWith('(HRMS)')) {
        await connection.query(
          `DELETE FROM actual_depreciation WHERE financial_year = ? AND category = ? AND asset_name = ?`,
          [year, row.category, row.asset_name]
        );
      }
    }

    const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

    for (const row of data) {
      let assetTotal = 0;
      
      const isHrms = row.assetName.endsWith('(HRMS)');

      for (const monthKey of MONTHS) {
        const amount = row[monthKey] || 0.00;

        if (!isHrms) {
          await connection.query(
          `INSERT INTO actual_depreciation 
           (financial_year, category, asset_name, dep_percentage, purchase_date, purchase_value, opening_date, wdv_opening_value, year_name, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             dep_percentage = VALUES(dep_percentage),
             purchase_date = VALUES(purchase_date),
             purchase_value = VALUES(purchase_value),
             opening_date = VALUES(opening_date),
             wdv_opening_value = VALUES(wdv_opening_value),
             amount = VALUES(amount)`,
          [year, row.category, row.assetName, row.depPercentage, row.purchaseDate, row.purchaseValue, row.openingDate, row.wdvOpeningValue, monthKey, amount]
        );
        }
        assetTotal += amount;
        moduleTotal += amount;
      }
    }

    await connection.query(
      `INSERT INTO actual_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'Depreciation', 'Grand Total', moduleTotal]
    );

    await connection.commit();
    return { message: 'Depreciation saved successfully' };
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ==========================================
// 7. AVAILABLE YEARS
// ==========================================
export const getCustomers = async () => {
  const [rows] = await db.query('SELECT CustomerID as id, COALESCE(MasterCustomerName, Name) as name FROM customer');
  return rows;
};

export const fetchAvailableYears = async () => {
  const [rows]: any = await db.query(`
    SELECT financial_year FROM actual_revenue_direct_expenses
    UNION
    SELECT financial_year FROM actual_corporate_expenses
    UNION
    SELECT financial_year FROM actual_salaries
    UNION
    SELECT financial_year FROM actual_bank_charges
    UNION
    SELECT financial_year FROM actual_totals
    UNION
    SELECT financial_year FROM actual_depreciation
  `);

  // Extract years, sort in descending order
  let years = rows.map((r: any) => r.financial_year);
  // Sort array in descending order 
  years.sort((a: string, b: string) => b.localeCompare(a));

  return years;
};
