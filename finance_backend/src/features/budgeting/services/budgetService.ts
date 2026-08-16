import { db } from '../../../config/database';

const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;
type Month = typeof MONTHS[number];

// ==========================================
// 1. REVENUE & DIRECT EXPENSES INTEGRATION
// ==========================================
export const fetchRevenueDirectExpenses = async (year: string) => {
  const [rows]: any = await db.query(
    'SELECT * FROM budget_revenue_direct_expenses WHERE financial_year = ?',
    [year]
  );

  // Group items back to the layout format expected by the frontend
  const groupedData: Record<string, any> = {};
  rows.forEach((row: any) => {
    const groupKey = `${row.customer}-${row.project}-${row.location}`;
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        customer: row.customer,
        project: row.project,
        location: row.location,
        year: row.financial_year,
        revenueMonths: {},
        directExpensePctMonths: {}
      };
    }
    groupedData[groupKey].revenueMonths[row.month] = parseFloat(row.revenue);
    groupedData[groupKey].directExpensePctMonths[row.month] = parseFloat(row.direct_expense_pct);
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
      'SELECT DISTINCT customer, project, location FROM budget_revenue_direct_expenses WHERE financial_year = ?',
      [year]
    );

    // 3. Delete groups that are no longer present in incoming data
    for (const row of existingRows) {
      const key = `${row.customer}|||${row.project}|||${row.location}`;
      if (!incomingKeys.has(key)) {
        await connection.query(
          `DELETE FROM budget_revenue_direct_expenses WHERE financial_year = ? AND customer = ? AND project = ? AND location = ?`,
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
          `INSERT INTO budget_revenue_direct_expenses 
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
        `INSERT INTO budget_revenue_direct_expenses_totals 
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
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
      [year, 'RevenueDirectExpense', 'Total Revenue', totalRevenue]
    );
    await connection.query(
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
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
  const [rows]: any = await db.query(
    'SELECT * FROM budget_corporate_expenses WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  rows.forEach((row: any) => {
    if (!grouped[row.head]) {
      grouped[row.head] = { head: row.head, year: row.financial_year };
    }
    grouped[row.head][row.month] = parseFloat(row.amount);
  });

  // Calculate "HO Salary" automatically from budget_salaries where customer = 'Head Office'
  const [hoSalaries]: any = await db.query(
    `SELECT month, SUM(CAST(amount AS DECIMAL(15,2))) AS total_salary 
     FROM budget_salaries 
     WHERE financial_year = ? AND (LOWER(TRIM(customer)) = 'head office' OR LOWER(TRIM(customer)) = 'ho')
     GROUP BY month`,
    [year]
  );

  if (!grouped["HO Salary"]) {
    grouped["HO Salary"] = { head: "HO Salary", year };
  }

  const hoSalaryMap: Record<string, number> = {};
  if (Array.isArray(hoSalaries)) {
    hoSalaries.forEach((s: any) => {
      if (s.month) {
        hoSalaryMap[s.month.toLowerCase()] = parseFloat(s.total_salary) || 0;
      }
    });
  }

  MONTHS.forEach(m => {
    const monthKey = m.toLowerCase();
    grouped["HO Salary"][monthKey] = hoSalaryMap[monthKey] || 0;
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
      'SELECT DISTINCT head FROM budget_corporate_expenses WHERE financial_year = ?',
      [year]
    );

    // 3. Delete heads that are no longer present in incoming data
    for (const row of existingRows) {
      if (!incomingHeads.has(row.head)) {
        await connection.query(
          `DELETE FROM budget_corporate_expenses WHERE financial_year = ? AND head = ?`,
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
          `INSERT INTO budget_corporate_expenses (financial_year, head, month, amount)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
          [year, row.head, month, amount]
        );
        headTotal += amount;
        moduleTotal += amount;
      }

      // Save individual head total
      await connection.query(
        `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'CorporateExpenses', row.head, headTotal]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
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
  const [rows]: any = await db.query(
    'SELECT * FROM budget_salaries WHERE financial_year = ?',
    [year]
  );

  const grouped: Record<string, any> = {};
  rows.forEach((row: any) => {
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
      'SELECT DISTINCT head, customer, project, location, designation, name_of_employee FROM budget_salaries WHERE financial_year = ?',
      [year]
    );

    // 3. Delete salaries that are no longer present in incoming data
    for (const row of existingRows) {
      const key = `${row.head}|||${row.customer}|||${row.project}|||${row.location}|||${row.designation}|||${row.name_of_employee}`;
      if (!incomingKeys.has(key)) {
        await connection.query(
          `DELETE FROM budget_salaries WHERE financial_year = ? AND head = ? AND customer = ? AND project = ? AND location = ? AND designation = ? AND name_of_employee = ?`,
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
          `INSERT INTO budget_salaries (financial_year, head, customer, project, location, designation, name_of_employee, month, amount)
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
        `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'Salaries', head, total]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
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
    'SELECT * FROM budget_bank_charges WHERE financial_year = ?',
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
      'SELECT DISTINCT head FROM budget_bank_charges WHERE financial_year = ?',
      [year]
    );

    // 3. Delete heads that are no longer present in incoming data
    for (const row of existingRows) {
      if (!incomingHeads.has(row.head)) {
        await connection.query(
          `DELETE FROM budget_bank_charges WHERE financial_year = ? AND head = ?`,
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
          `INSERT INTO budget_bank_charges (financial_year, head, month, amount)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
          [year, row.head, month, amount]
        );
        headTotal += amount;
        moduleTotal += amount;
      }

      // Save individual head total
      await connection.query(
        `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
        [year, 'BankCharges', row.head, headTotal]
      );
    }

    // Save grand total
    await connection.query(
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
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
  const [revExpRows]: any = await db.query(
    'SELECT month, revenue, direct_expense_pct FROM budget_revenue_direct_expenses WHERE financial_year = ?',
    [year]
  );

  // 2. Fetch Corporate Expenses
  const [corpRows]: any = await db.query(
    'SELECT month, SUM(amount) as total_corp FROM budget_corporate_expenses WHERE financial_year = ? GROUP BY month',
    [year]
  );

  // 3. Fetch Bank Charges
  const [bankRows]: any = await db.query(
    'SELECT month, SUM(amount) as total_bank FROM budget_bank_charges WHERE financial_year = ? GROUP BY month',
    [year]
  );

  // 4. Fetch Depreciation/Tax manual inputs
  const [summaryInputRows]: any = await db.query(
    'SELECT month, depreciation, income_tax FROM summary_inputs WHERE financial_year = ?',
    [year]
  );

  // 4. Fetch Depreciation
  const depRows: any = await fetchDepreciation(year);

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
    const m = r.month as Month;
    const rev = parseFloat(r.revenue) || 0;
    const pct = parseFloat(r.direct_expense_pct) || 0;
    monthlySummary[m].revenue += rev;
    monthlySummary[m].directExpenses += (rev * pct) / 100;
  });

  corpRows.forEach((r: any) => {
    const m = r.month as Month;
    monthlySummary[m].corporateExpenses += parseFloat(r.total_corp) || 0;
  });

  bankRows.forEach((r: any) => {
    const m = r.month as Month;
    monthlySummary[m].bankInterest += parseFloat(r.total_bank) || 0;
  });

  depRows.forEach((row: any) => {
    MONTHS.forEach(m => {
      if (monthlySummary[m]) {
        monthlySummary[m].depreciation += parseFloat(row[m]) || 0;
      }
    });
  });

  summaryInputRows.forEach((r: any) => {
    const m = r.month as Month;
    monthlySummary[m].incomeTax += parseFloat(r.income_tax) || 0;
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
    'SELECT * FROM budget_depreciation WHERE financial_year = ?',
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

  return Object.values(grouped);
};

export const upsertDepreciation = async (year: string, data: any[]) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let moduleTotal = 0;

    // 1. Get incoming keys
    const incomingKeys = new Set(data.map(row => `${row.category}|||${row.assetName}`));

    // 2. Fetch existing assets in DB for this year
    const [existingRows]: any = await connection.query(
      'SELECT DISTINCT category, asset_name FROM budget_depreciation WHERE financial_year = ?',
      [year]
    );

    // 3. Delete assets that are no longer present in incoming data
    for (const row of existingRows) {
      const key = `${row.category}|||${row.asset_name}`;
      if (!incomingKeys.has(key)) {
        await connection.query(
          `DELETE FROM budget_depreciation WHERE financial_year = ? AND category = ? AND asset_name = ?`,
          [year, row.category, row.asset_name]
        );
      }
    }

    // 4. Insert or Update incoming assets with 12 MONTHS
    const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

    for (const row of data) {
      let assetTotal = 0;

      for (const monthKey of MONTHS) {
        const amount = row[monthKey] || 0.00;

        await connection.query(
          `INSERT INTO budget_depreciation 
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
        assetTotal += amount;
        moduleTotal += amount;
      }
    }

    // Since Depreciation is usually added to totals as well, but it might mess up existing logic if we add it directly without mapping to a specific module. We can skip actual_totals for now as the user screenshot does not show totals integration yet, but we will add it just in case.
    await connection.query(
      `INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
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
export const fetchAvailableYears = async () => {
  const [rows]: any = await db.query(`
    SELECT financial_year FROM budget_revenue_direct_expenses
    UNION
    SELECT financial_year FROM budget_corporate_expenses
    UNION
    SELECT financial_year FROM budget_salaries
    UNION
    SELECT financial_year FROM budget_bank_charges
    UNION
    SELECT financial_year FROM budget_totals
    UNION
    SELECT financial_year FROM budget_depreciation
  `);

  // Extract years, sort in descending order
  let years = rows.map((r: any) => r.financial_year);
  // Sort array in descending order 
  years.sort((a: string, b: string) => b.localeCompare(a));

  return years;
};
