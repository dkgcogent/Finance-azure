import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface InvoicePreviewTemplateProps {
  customerName?: string;       // Full name e.g. "Reliance (RQS001)"
  customerCode?: string;       // e.g. "RQS001", "FLIP001"
  projectName?: string;
  invoiceLocation?: string;    // Location text value
  invoiceType?: string;        // "Fixed" | "Adhoc"
  startDate?: string;
  endDate?: string;
  invoiceDate?: string;
  reportData?: { misData: any[]; annexureData: any[] } | null;
  // Additional metadata fields
  workOrderNo?: string;
  serviceProviderCode?: string;
  costCode?: string;
  ourGSTIN?: string;
  ourPAN?: string;
  ourState?: string;
  ourCompanyName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

const toWords = (n: number): string => {
  if (n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lac' + (num % 100000 !== 0 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
  };
  return convert(Math.floor(n)) + ' Rupees Only';
};

const formatDate = (d?: string) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Ecosystem Detection ──────────────────────────────────────────────────────
const detectEcosystem = (customerCode?: string, customerName?: string): 'reliance' | 'flipkart' | 'unknown' => {
  const str = ((customerCode || '') + (customerName || '')).toLowerCase();
  if (str.includes('rqs') || str.includes('qwik') || str.includes('reliance')) return 'reliance';
  if (str.includes('flip') || str.includes('instakart') || str.includes('instra')) return 'flipkart';
  return 'unknown';
};

// ─── Shared: Company Header ───────────────────────────────────────────────────
const CogentHeader = () => (
  <div className="flex justify-between items-start mb-2">
    <div className="text-3xl font-black text-[#0070c0]">cogentes</div>
    <div className="text-center flex-1 pr-4">
      <h2 className="text-lg font-bold font-serif text-[#002060]">Cogent Logistics Private Limited</h2>
      <p className="text-xs">CIN No.: U63040DL2013PTC260297</p>
      <p className="text-xs">201C/6, Second Floor, D-21 Corporate Park, Sector 21, Dwarka, New Delhi - 110077 India</p>
      <p className="text-xs">
        E-mail: <a href="mailto:info@cogentlogistics.in" className="text-blue-600 underline">info@cogentlogistics.in</a>
        {' '} | Web: <a href="http://www.cogentlogistics.in" className="text-blue-600 underline">www.cogentlogistics.in</a>
        {' '} | Phone: +91 11 41099971
      </p>
    </div>
  </div>
);

// ─── Shared: Bank Details ─────────────────────────────────────────────────────
const BankDetails = () => (
  <table className="w-full border-collapse border-x-2 border-b-2 border-black">
    <tbody>
      <tr><td colSpan={2} className="p-1 font-bold underline">Our Bank Details :-</td></tr>
      <tr>
        <td className="border-2 border-black p-1 w-1/4">Account Holder Name</td>
        <td className="border-2 border-black p-1 text-center">Cogent Logistics Private Limited</td>
      </tr>
      <tr>
        <td className="border-2 border-black p-1">Bank Name</td>
        <td className="border-2 border-black p-1 text-center">ICICI Bank</td>
      </tr>
      <tr>
        <td className="border-2 border-black p-1">Account No.</td>
        <td className="border-2 border-black p-1 text-center font-medium bg-emerald-50 relative">
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[8px] border-t-emerald-500 border-r-[8px] border-r-transparent" />
          163951000002
        </td>
      </tr>
      <tr>
        <td className="border-2 border-black p-1">IFSC Code</td>
        <td className="border-2 border-black p-1 text-center">ICIC0001639</td>
      </tr>
      <tr>
        <td className="border-2 border-black p-1">Branch</td>
        <td className="border-2 border-black p-1 text-center">Pankaj Arcade, Shop no 3,4,5,6, Plot no 5, MLU Sec 11, Dwarka, New Delhi - 110075</td>
      </tr>
    </tbody>
  </table>
);

// ─── RELIANCE (QWIK) Invoice Template ────────────────────────────────────────
const RelianceInvoice: React.FC<InvoicePreviewTemplateProps & { totalFreight: number; totalTax: number; grandTotal: number }> = ({
  customerName, projectName, invoiceLocation, invoiceType, startDate, endDate, invoiceDate,
  workOrderNo, serviceProviderCode, totalFreight, totalTax, grandTotal,
  ourGSTIN, ourPAN, ourState, ourCompanyName
}) => {
  const isInterState = invoiceLocation?.toLowerCase().includes('uttar') || invoiceLocation?.toLowerCase().includes('up');
  const igst = isInterState ? totalTax : 0;
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const period = (startDate && endDate) ? `${formatDate(startDate)} to ${formatDate(endDate)}` : '25-Apr-2025 to 24-May-2025';

  return (
    <div className="border-2 border-black bg-white text-black text-xs p-6 font-serif mx-auto max-w-4xl shadow-lg">
      <CogentHeader />
      <div className="text-center font-bold pb-1 text-xs">(Original For Recipient)</div>

      <table className="w-full border-collapse border-2 border-black text-xs">
        <tbody>
          {/* Vendor Block */}
          <tr>
            <td colSpan={2} className="border-2 border-black p-2">
              <span className="font-bold">Vendor Name : {ourCompanyName || 'Cogent Logistics Private Limited'}</span><br />
              <span className="font-bold">Vendor Address : 201C/6, Second Floor, D-21 Corporate Park, Sector-21, Dwarka, New Delhi - 110077</span><br />
              <span className="font-bold">State : {ourState || 'DL'} &nbsp;|&nbsp; Vendor GST No.: {ourGSTIN || '07AAFCC4715N1ZG'} &nbsp;|&nbsp; Vendor PAN No.: {ourPAN || 'AAFCC4715N'}</span>
            </td>
          </tr>

          {/* Consignor / Invoice Info */}
          <tr>
            <td className="border-2 border-black p-2 align-top w-1/2">
              <span className="font-bold">Service Recipient Name and Address</span><br />
              <span className="font-bold">Name - QWIK Supply Chain Private Ltd</span><br />
              <span className="font-bold">(Formerly - Fine Tech Corporation Pvt Ltd)</span><br />
              <span className="font-bold">Address: Plot No TC 58V &amp; 59V, Eldeco Corporate Chamber 2,</span><br />
              <span className="font-bold">Phase I, Vibhut Gomti Nagar, LUCKNOW - 226010, Uttar Pradesh</span><br />
              <span className="font-bold">GSTIN: 09AAACF5232A1Z7 &nbsp;|&nbsp; PAN: AAACF5232A</span>
            </td>
            <td className="border-2 border-black p-2 align-top w-1/2 font-bold">
              Tax Invoice No.: CLPL/25-26/—<br />
              Tax Invoice Date: {formatDate(invoiceDate || endDate) || '—'}<br /><br />
              SAC Code + Category: 996819<br /><br />
              Place of supply of Service: {projectName || '—'} {invoiceLocation || ''}<br /><br />
              {workOrderNo && <>Work Order No: {workOrderNo}<br /></>}
              {serviceProviderCode && <>Service Provider Code: {serviceProviderCode}</>}
            </td>
          </tr>

          {/* Consignor/Consignee Details */}
          <tr>
            <td className="border-2 border-black p-2 align-top font-bold">
              Consignor Details<br />
              Name: As per Annex.<br />
              Address: As per Annex.<br />
              CN No.: As per Annex.<br />
              Goods Tax Inv. No. (Supplier): As per Annex.
            </td>
            <td className="border-2 border-black p-2 align-top font-bold">
              Consignee Details:<br />
              Name: As per Annex.<br />
              Address: As per Annex.<br />
              CN Date: As per Annex.<br />
              Goods Tax Inv. Date (Supplier): As per Annex.
            </td>
          </tr>

          {/* Transport Info */}
          <tr>
            <td className="border-2 border-black p-2 align-top font-bold">
              Mode of Transport: By Road<br />
              Gross Weight (Quantity): As per Annex.<br />
              <span className="font-normal">Being the Transportation charges for the period {period} as per annexure attached.</span><br />
              <br />
              Freight (in amount)
              <div className="text-right pr-4">{formatCurrency(totalFreight)}</div>
            </td>
            <td className="border-2 border-black p-2 align-top font-bold">
              Goods Transported:
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold">Freight (in words)</td>
            <td className="border-2 border-black p-1 font-bold">Rs. {toWords(totalFreight)}</td>
          </tr>

          {/* Tax Cert */}
          <tr>
            <td colSpan={2} className="border-2 border-black p-1 font-bold underline text-center text-xs">
              We hereby certify that we have availed input tax credit on Goods and/or Services used for providing the service under reference.
            </td>
          </tr>

          {/* Tax Breakdown */}
          <tr>
            <td className="border-2 border-black p-2 font-bold">
              <div className="flex justify-between"><span>Central Tax</span><span>9%</span></div>
              <div className="flex justify-between"><span>State Tax</span><span>9%</span></div>
              <div className="flex justify-between"><span>Integrated Tax</span><span>18%</span></div>
              <div className="flex justify-between"><span>Union Territory Tax</span><span>0%</span></div>
              <div className="flex justify-between"><span>Cess</span><span>0%</span></div>
            </td>
            <td className="border-2 border-black p-2 font-bold text-right align-bottom">
              {igst > 0 && <div>IGST @18%: {formatCurrency(igst)}</div>}
              {cgst > 0 && <div>CGST @9%: {formatCurrency(cgst)}</div>}
              {sgst > 0 && <div>SGST @9%: {formatCurrency(sgst)}</div>}
            </td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold">Total Amount</td>
            <td className="border-2 border-black p-1 font-bold text-right">{formatCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold">Total Amount in Words</td>
            <td className="border-2 border-black p-1 font-bold">Rs. {toWords(grandTotal)}</td>
          </tr>

          {/* Signatures */}
          <tr>
            <td className="border-2 border-black p-1 font-bold align-top h-20">Receiver Signature:</td>
            <td className="border-2 border-black p-1 font-bold text-right align-top relative h-20">
              <div className="text-center w-full">For Cogent Logistics Private Limited</div>
              <div className="absolute bottom-2 right-2 left-2 text-center text-xs">Authorised Signatory</div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="border-2 border-black p-1 text-xs">
              <span className="font-bold underline">Principal Place of Business (Supplier):</span><br />
              <span className="font-bold ml-4">Registered Office Address: 42, Rose Apartment, Sector 18-B, Dwarka, New Delhi - 110075</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ─── FLIPKART (INSTAKART) Invoice Template ────────────────────────────────────
const FlipkartInvoice: React.FC<InvoicePreviewTemplateProps & { totalFreight: number; totalTax: number; grandTotal: number }> = ({
  projectName, invoiceLocation, invoiceType, startDate, endDate, invoiceDate,
  costCode, totalFreight, totalTax, grandTotal,
  ourGSTIN, ourPAN, ourState, ourCompanyName
}) => {
  // Determine GST split based on state
  const isInterState = invoiceLocation?.toLowerCase().includes('uttar') || invoiceLocation?.toLowerCase().includes('up');
  const igst = isInterState ? totalTax : 0;
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;

  const period = (startDate && endDate)
    ? `${formatDate(startDate)} to ${formatDate(endDate)}`
    : '1st May to 31st May 2025';

  // Resolve customer address based on state
  const isUP = isInterState;
  const customerAddress = isUP ? (
    <>M/s Instakart Services Pvt Ltd,<br />KHASRA NO. 1132, UNITED WORLD WAREHOUSE,<br />NEAR CRPF CAMP BIJNAUR, VILLAGE MATI,<br />LUCKNOW, UTTAR PRADESH 226002</>
  ) : invoiceLocation?.toLowerCase().includes('hary') || invoiceLocation?.toLowerCase().includes('hyn') || invoiceLocation?.toLowerCase().includes('gurugram') ? (
    <>M/s Instakart Services Private Limited,<br />219/15, BOHRAKALAN, WARD NO. 67, TEH. PATAUDI,<br />GURGAON, HARYANA - 122413</>
  ) : (
    <>M/s Instrakart Services Pvt Ltd,<br />PLOT NO 36/3 AND 37 BAMNOLI VILLAGE,<br />DELHI, WEST DELHI, DELHI - 110077</>
  );

  const customerGSTIN = isUP ? '09AADCI8374D1ZI'
    : invoiceLocation?.toLowerCase().includes('hary') ? '06AADCI8374D1Z'
      : '07AADCI8374D2Z';

  const tripTypeLabel = invoiceType === 'Fixed' ? 'Fix' : 'Adhoc';
  const description = `${tripTypeLabel} Transportation Charges ${projectName || ''} ${invoiceLocation || ''} for the Period Of ${period} (as per annexure attached)`;

  return (
    <div className="border-2 border-black bg-white text-black text-xs p-4 font-serif mx-auto max-w-4xl shadow-lg">
      <CogentHeader />

      <div className="border-y-2 border-black text-center font-bold uppercase py-1">
        <span className="underline">TAX INVOICE</span>
      </div>

      {/* Invoice meta */}
      <table className="w-full border-collapse border-x-2 border-black">
        <tbody>
          <tr>
            <td className="border-2 border-black p-1 font-bold w-1/4">Invoice No.</td>
            <td className="border-2 border-black p-1 w-1/4">: CLPL/25-26/—</td>
            <td className="border-2 border-black p-1 font-bold w-1/4">Date</td>
            <td className="border-2 border-black p-1 w-1/4">: {formatDate(invoiceDate || endDate) || '—'}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold">Our GSTIN</td>
            <td className="border-2 border-black p-1">: {ourGSTIN || '07AAFCC4715N1ZG'}</td>
            <td className="border-2 border-black p-1 font-bold">Invoice Under RCM</td>
            <td className="border-2 border-black p-1 line-through decoration-2">: No</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold">Service Category</td>
            <td className="border-2 border-black p-1">: Transportation</td>
            <td className="border-2 border-black p-1 font-bold">Customer PO No.</td>
            <td className="border-2 border-black p-1">: Agreement</td>
          </tr>
        </tbody>
      </table>

      {/* Invoice To / For */}
      <table className="w-full border-collapse border-x-2 border-black">
        <tbody>
          <tr className="align-top">
            <td className="border-2 border-black p-2 w-1/2">
              <span className="font-bold underline">Invoice To :-</span>
              <span className="ml-4 font-bold">GSTIN - {customerGSTIN}</span>
              <div className="mt-2 font-bold">{customerAddress}</div>
            </td>
            <td className="border-2 border-black p-2 w-1/2">
              <span className="font-bold underline">Invoice For / Place Of Supply :-</span>
              <div className="mt-2 font-bold">{customerAddress}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Article Description */}
      <div className="border-x-2 border-b-2 border-black p-1 text-center font-bold">Article Description</div>
      <div className="border-x-2 border-b-2 border-black p-2 text-center font-bold">{description}</div>

      {/* Line Items Grid */}
      <table className="w-full border-collapse border-x-2 border-black text-center">
        <thead>
          <tr>
            <th className="border-2 border-black p-1 font-bold">S No</th>
            <th className="border-2 border-black p-1 font-bold">HSN</th>
            <th className="border-2 border-black p-1 font-bold">Description</th>
            {costCode && <th className="border-2 border-black p-1 font-bold">Cost Code</th>}
            <th className="border-2 border-black p-1 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-x-2 border-black p-1">1</td>
            <td className="border-x-2 border-black p-1">996819</td>
            <td className="border-x-2 border-black p-1 text-left px-2">Transportation Charges</td>
            {costCode && <td className="border-x-2 border-black p-1">{costCode}</td>}
            <td className="border-x-2 border-black p-1">{formatCurrency(totalFreight)}</td>
          </tr>
          <tr className="h-8">
            <td className="border-x-2 border-black p-1"></td>
            <td className="border-x-2 border-black p-1"></td>
            <td className="border-x-2 border-black p-1"></td>
            {costCode && <td className="border-x-2 border-black p-1"></td>}
            <td className="border-x-2 border-black p-1"></td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1" colSpan={costCode ? 3 : 2}></td>
            {!costCode && <td className="border-2 border-black p-1"></td>}
            <td className="border-2 border-black p-1 font-bold">Total</td>
            <td className="border-2 border-black p-1 font-bold">{formatCurrency(totalFreight)}</td>
          </tr>
        </tbody>
      </table>
      <div className="h-6 border-x-2 border-b-2 border-black"></div>

      <BankDetails />
      <div className="h-2 border-x-2 border-black"></div>

      {/* Totals */}
      <table className="w-full border-collapse border-2 border-black">
        <tbody>
          <tr>
            <td rowSpan={4} className="border-2 border-black p-2 align-top w-[55%]">
              <span className="font-bold underline">Amount in Words:</span><br />
              {toWords(grandTotal)}
            </td>
            <td className="border-2 border-black p-1 font-bold text-center">Sub Total Before Tax</td>
            <td className="border-2 border-black p-1 text-right font-bold">{formatCurrency(totalFreight)}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold text-center">IGST @18%</td>
            <td className="border-2 border-black p-1 text-right font-bold">{igst > 0 ? formatCurrency(igst) : '-'}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold text-center">CGST @9%</td>
            <td className="border-2 border-black p-1 text-right font-bold">{cgst > 0 ? formatCurrency(cgst) : '-'}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-1 font-bold text-center">SGST @9%</td>
            <td className="border-2 border-black p-1 text-right font-bold">{sgst > 0 ? formatCurrency(sgst) : '-'}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-0 border-t-0"></td>
            <td className="border-2 border-black p-1 font-bold text-center">Grand Total After Tax</td>
            <td className="border-2 border-black p-1 text-right font-bold">{formatCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="border-x-2 border-b-2 border-black p-2 border-t-0 h-16 align-bottom pb-2 relative">
              <span className="absolute bottom-10 left-0 right-0 text-center font-bold">For Cogent Logistics Private Limited</span>
              <span className="absolute bottom-2 left-0 right-0 text-center text-xs">Authorised Signatory</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ─── No Selection Fallback ────────────────────────────────────────────────────
const NoSelectionFallback = () => (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
    <div className="text-6xl">📄</div>
    <p className="text-lg font-medium">Invoice Preview</p>
    <p className="text-sm">Complete the details and MIS/Annexure steps to generate your invoice preview.</p>
  </div>
);

// ─── Main Export ──────────────────────────────────────────────────────────────
export const InvoicePreviewTemplate: React.FC<InvoicePreviewTemplateProps> = (props) => {
  const { customerCode, customerName, reportData, invoiceType } = props;

  // Compute financial aggregates from actual report data
  const totalFreight = React.useMemo(() => {
    if (!reportData) return 0;
    const fromFlipkart = (reportData.flipkartAnnexureData || []).reduce((sum: number, r: any) => {
      const v = parseFloat(r.amount || r.totalAmount || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const fromFlipkartAdhoc = (reportData.flipkartAdhocAnnexureData || []).reduce((sum: number, r: any) => {
      const v = parseFloat(r.amount || r.totalAmount || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const fromAnnexure = (reportData.annexureData || []).reduce((sum: number, r: any) => {
      const v = parseFloat(r.totalAmount || r.amount || r.totalFixCost || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const fromMIS = (reportData.misData || []).reduce((sum: number, r: any) => {
      const v = parseFloat(r.FreightFix || r.VFreightFix || r.totalFreight || r.amount || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    return fromFlipkart || fromFlipkartAdhoc || fromAnnexure || fromMIS || 0;
  }, [reportData]);

  const totalTax = totalFreight * 0.18;
  const grandTotal = totalFreight + totalTax;

  const ecosystem = detectEcosystem(customerCode, customerName);

  const firstMisRow = reportData?.misData?.[0] || {};
  const dynamicProps = {
    ourGSTIN: firstMisRow.GSTNo || undefined,
    ourPAN: firstMisRow.GSTNo && firstMisRow.GSTNo.length >= 12 ? firstMisRow.GSTNo.substring(2, 12) : undefined,
    ourState: firstMisRow.ourState || undefined,
    ourCompanyName: firstMisRow.CompanyName || undefined,
  };

  if (!customerName && !customerCode) return <NoSelectionFallback />;

  if (ecosystem === 'reliance') {
    return (
      <RelianceInvoice
        {...props}
        {...dynamicProps}
        totalFreight={totalFreight}
        totalTax={totalTax}
        grandTotal={grandTotal}
      />
    );
  }

  if (ecosystem === 'flipkart') {
    return (
      <FlipkartInvoice
        {...props}
        {...dynamicProps}
        totalFreight={totalFreight}
        totalTax={totalTax}
        grandTotal={grandTotal}
      />
    );
  }

  // Generic fallback for unknown ecosystems — uses Flipkart-style corporate tax invoice
  return (
    <FlipkartInvoice
      {...props}
      {...dynamicProps}
      totalFreight={totalFreight}
      totalTax={totalTax}
      grandTotal={grandTotal}
    />
  );
};
