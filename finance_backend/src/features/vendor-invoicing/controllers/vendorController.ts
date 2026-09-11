import { Request, Response } from 'express';
import { db as pool } from '../../../config/database';
import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
dotenv.config();

const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage Connection string not found');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
};
const generateVendorInvoiceNumber = async (): Promise<string> => {
  const fy = '26-27'; 
  const [rows]: any = await pool.query(
    `SELECT vendor_invoice_number FROM vendor_invoices 
     ORDER BY id DESC LIMIT 1`
  );

  let nextSequence = 1;
  if (rows.length > 0) {
    const lastInvoiceNum = rows[0].vendor_invoice_number;
    const parts = lastInvoiceNum.split('/');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(3, '0');
  return `VN/${fy}/${paddedSequence}`;
};

export const getVendors = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        VendorID as id, 
        VendorName as name, 
        VendorMobileNo as mobileNo,
        VendorAlternateNo as alternateNo,
        CompanyName as companyName,
        TypeOfCompany as type, 
        CompanyGST as gstNo, 
        AddressOfCompany as companyAddress, 
        VendorAddress as address,
        HouseFlatNo,
        StreetLocality,
        City,
        State,
        PinCode,
        Country
      FROM vendor 
      WHERE Status = 'active' OR Status = 'Active' OR Status IS NULL
      ORDER BY VendorName ASC
    `);

    const formattedRows = rows.map((r: any) => {
      const companyNameStr = (r.companyName || '').trim();
      const typeOfCompStr = (r.type || '').trim();
      const vendorPersonName = (r.name || '').trim();
      const resolvedCompanyName = companyNameStr 
        ? (typeOfCompStr && !companyNameStr.toLowerCase().includes(typeOfCompStr.toLowerCase()) ? `${companyNameStr} ${typeOfCompStr}` : companyNameStr)
        : vendorPersonName;

      const combinedName = (resolvedCompanyName && vendorPersonName && resolvedCompanyName.toLowerCase() !== vendorPersonName.toLowerCase())
        ? `${resolvedCompanyName} (${vendorPersonName})`
        : (resolvedCompanyName || vendorPersonName);

      const addrParts = [
        r.HouseFlatNo,
        r.StreetLocality,
        r.City,
        r.State,
        r.PinCode,
        r.Country
      ].filter((p: any) => p && String(p).trim().length > 0);

      const baseAddress = (r.address && r.address.trim() !== '' && r.address.trim() !== ',')
        ? r.address.trim()
        : (addrParts.length > 0 ? addrParts.join(', ') : (r.companyAddress || ''));

      const contacts = [r.mobileNo, r.alternateNo]
        .filter((c: any) => c && String(c).trim().length > 0 && String(c).trim() !== 'null' && String(c).trim() !== 'undefined');
      const contactStr = contacts.length > 0 ? `Ph: ${contacts.join(' / ')}` : '';
      const addressWithContact = [baseAddress, contactStr].filter(Boolean).join(' | ');

      return {
        ...r,
        vendorName: vendorPersonName,
        rawCompanyName: resolvedCompanyName,
        displayCompanyName: combinedName,
        companyNameWithVendor: combinedName,
        address: baseAddress,
        addressWithContact: addressWithContact
      };
    });

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const getVendorTrips = async (req: Request, res: Response) => {
  try {
    const { vendorName, startDate, endDate, tripType, customerId, projectId, locationId } = req.query;

    if (!vendorName || !startDate || !endDate) {
      return res.status(400).json({ error: 'vendorName, startDate, and endDate are required' });
    }

    // First get the vendor details
    const [vendorRows]: any = await pool.query(
      `SELECT 
        VendorID, 
        VendorName, 
        VendorCode, 
        VendorMobileNo,
        VendorAlternateNo,
        CompanyName, 
        TypeOfCompany, 
        CompanyGST, 
        VendorCompanyUdhyam, 
        VendorCompanyPAN, 
        StartDateOfCompany, 
        AddressOfCompany, 
        VendorAddress, 
        HouseFlatNo, 
        StreetLocality, 
        City, 
        State, 
        PinCode, 
        Country, 
        AccountHolderName, 
        AccountNumber, 
        IFSCCode, 
        BankName, 
        BranchName, 
        BranchAddress, 
        BankCity, 
        BankState 
      FROM vendor 
      WHERE VendorID = ? OR VendorName = ? OR CompanyName = ?`, 
      [vendorName, vendorName, vendorName]
    );
    if (vendorRows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    const rawVendor = vendorRows[0];
    const companyNameStr = (rawVendor.CompanyName || '').trim();
    const typeOfCompStr = (rawVendor.TypeOfCompany || '').trim();
    const vendorPersonName = (rawVendor.VendorName || '').trim();
    const resolvedCompanyName = companyNameStr 
      ? (typeOfCompStr && !companyNameStr.toLowerCase().includes(typeOfCompStr.toLowerCase()) ? `${companyNameStr} ${typeOfCompStr}` : companyNameStr)
      : vendorPersonName;

    const combinedName = (resolvedCompanyName && vendorPersonName && resolvedCompanyName.toLowerCase() !== vendorPersonName.toLowerCase())
      ? `${resolvedCompanyName} (${vendorPersonName})`
      : (resolvedCompanyName || vendorPersonName);

    // Vendor Basic Address from VendorAddress or structured fields (HouseFlatNo, StreetLocality, City, State, PinCode, Country)
    const addrParts = [
      rawVendor.HouseFlatNo,
      rawVendor.StreetLocality,
      rawVendor.City,
      rawVendor.State,
      rawVendor.PinCode,
      rawVendor.Country
    ].filter((p: any) => p && String(p).trim().length > 0);

    const resolvedVendorAddress = (rawVendor.VendorAddress && rawVendor.VendorAddress.trim() !== '' && rawVendor.VendorAddress.trim() !== ',')
      ? rawVendor.VendorAddress.trim()
      : (addrParts.length > 0 ? addrParts.join(', ') : (rawVendor.AddressOfCompany || ''));

    // Vendor Contact numbers (VendorMobileNo, VendorAlternateNo)
    const contacts = [rawVendor.VendorMobileNo, rawVendor.VendorAlternateNo]
      .filter((c: any) => c && String(c).trim().length > 0 && String(c).trim() !== 'null' && String(c).trim() !== 'undefined');
    const contactStr = contacts.length > 0 ? `Ph: ${contacts.join(' / ')}` : '';
    const fullAddressWithContact = [resolvedVendorAddress, contactStr].filter(Boolean).join(' | ');

    const vendorInfo = {
      ...rawVendor,
      VendorName: rawVendor.VendorName,
      VendorMobileNo: rawVendor.VendorMobileNo || '',
      VendorAlternateNo: rawVendor.VendorAlternateNo || '',
      CompanyName: rawVendor.CompanyName,
      TypeOfCompany: rawVendor.TypeOfCompany,
      displayCompanyName: combinedName,
      vendorCompanyName: combinedName,
      companyNameWithVendor: combinedName,
      rawCompanyName: resolvedCompanyName,
      CompanyGST: rawVendor.CompanyGST || '',
      gstNo: rawVendor.CompanyGST || '',
      AddressOfCompany: rawVendor.AddressOfCompany,
      VendorAddress: resolvedVendorAddress || rawVendor.VendorAddress || '',
      addressWithContact: fullAddressWithContact,
      fullAddressWithContact: fullAddressWithContact,
      AccountHolderName: rawVendor.AccountHolderName || rawVendor.CompanyName || rawVendor.VendorName,
      AccountNumber: rawVendor.AccountNumber || '',
      IFSCCode: rawVendor.IFSCCode || '',
      BankName: rawVendor.BankName || '',
      BranchName: rawVendor.BranchName || rawVendor.BranchAddress || rawVendor.BankCity || ''
    };
    const actualVendorName = rawVendor.VendorName;

    // Fetch commercial rates
    const placementType = tripType === 'adhoc' ? 'Adhoc' : 'Fixed';
    const stateFilter = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null') 
      ? String(locationId).trim() 
      : null;

    const custIdVal = customerId ? String(customerId) : null;
    const projIdVal = projectId ? String(projectId) : null;

    const [commercialRows]: any = await pool.query(
      `SELECT * FROM vendor_commercial 
       WHERE (vendor_name = ? OR vendor_id = ? OR (vendor_name IS NOT NULL AND vendor_name LIKE CONCAT('%', ?, '%'))) 
       ORDER BY 
         (CASE WHEN ? IS NOT NULL AND (project_id = ? OR project LIKE CONCAT('%', ?, '%')) THEN 0 ELSE 1 END),
         (CASE WHEN ? IS NOT NULL AND (LOWER(state) = LOWER(?) OR LOWER(state) LIKE CONCAT('%', LOWER(?), '%')) THEN 0 ELSE 1 END),
         (CASE WHEN LOWER(type_of_vehicle_placement) = LOWER(?) THEN 0 ELSE 1 END), 
         id DESC`,
      [actualVendorName, vendorName, actualVendorName, projIdVal, projIdVal, projIdVal, stateFilter, stateFilter, stateFilter, placementType]
    );
    const commercialRates = commercialRows.length > 0 ? commercialRows[0] : null;

    if (tripType === 'adhoc') {
      // Fetch all trips for this vendor in the date range
      const [rawTrips]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%d/%m/%Y') as date,
          at.Location, at.CustomerSite, at.CustSite, at.VendorName, at.VehicleNumber, at.VehicleType, at.VehicleOwnershipType, at.TripType, at.DriverType, 
          p.State as ProjectState, p.LocationsJSON,
          COALESCE(at.ArrivalTimeAtHub, at.InTimeByCust, at.VehicleReportingAtHub, at.VehicleEntryInHub) as ArrivalTimeAtHub, 
          COALESCE(at.OutTimeFromHub, at.VehicleOutFromHubFinal, at.ReturnReportingTime, at.OutTimeFrom, at.VehicleReturnAtHub, at.VehicleOutFromHubForDelivery) as OutTimeFromHub, 
          at.OpeningKM, at.ClosingKM, at.ExtraKM, at.ExtraKMCost, at.VFreightFix, at.DCMCharges, at.TotalFreight,
          vc.fixed_rate as vc_fixed_rate,
          vc.additional_rate_per_km as vc_additional_rate_per_km,
          vc.over_time_charges as vc_over_time_charges,
          vc.state as vc_state
        FROM adhoc_transactions at
        LEFT JOIN project p ON p.ProjectID = at.ProjectID
        LEFT JOIN vendor_commercial vc ON at.vendor_commercial_id = vc.id
        WHERE (at.VendorName = ? OR at.VendorID = ? OR (at.VendorName IS NOT NULL AND at.VendorName LIKE CONCAT('%', ?, '%'))) 
          AND DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%Y-%m-%d') BETWEEN ? AND ?
          AND (? IS NULL OR ? = '' OR at.CustomerID = ? OR (at.CompanyName IS NOT NULL AND at.CompanyName LIKE CONCAT('%', ?, '%')))
          AND (? IS NULL OR ? = '' OR at.ProjectID = ? OR p.ProjectName IN (SELECT ProjectName FROM project WHERE ProjectID = ?))
      `, [
        actualVendorName, vendorName, actualVendorName,
        startDate, endDate,
        custIdVal, custIdVal, custIdVal, custIdVal,
        projIdVal, projIdVal, projIdVal, projIdVal
      ]);

      const trips = rawTrips.filter((t: any) => {
        if (!stateFilter) return true;
        const filterLower = stateFilter.toLowerCase();

        if (t.vc_state) {
          return t.vc_state.toLowerCase().includes(filterLower);
        }

        if (t.LocationsJSON) {
          try {
            const locArray = JSON.parse(t.LocationsJSON);
            const siteRaw = (t.CustomerSite || t.CustSite || t.Location || '').toLowerCase();
            const matchedEntry = locArray.find((item: any) => {
              const loc = (item.Location || '').toLowerCase();
              const site = (item.CustomerSite || '').toLowerCase();
              return (loc && siteRaw.includes(loc)) || (site && siteRaw.includes(site));
            });
            if (matchedEntry && matchedEntry.State) {
              return matchedEntry.State.toLowerCase().includes(filterLower);
            }
          } catch (e) {}
        }

        const siteRaw = (t.CustomerSite || t.CustSite || t.Location || '').toLowerCase();
        const upCities = ['noida', 'lucknow', 'ghaziabad', 'kanpur', 'agra', 'varanasi', 'meerut', 'greater noida', 'rampur', 'aligarh', 'bareilly', 'moradabad'];
        const dlCities = ['dwarka', 'delhi', 'janakpuri', 'okhla', 'rohini', 'mayapuri', 'azadpur', 'kapashera', 'narela', 'rajiv chowk', 'ram nagar'];
        const hrCities = ['gurgaon', 'gurugram', 'faridabad', 'manesar', 'sonipat', 'panipat', 'karnal', 'palwal', 'rewari', 'bahadurgarh', 'ambala', 'hisar', 'rohtak'];

        if (filterLower.includes('delhi') || filterLower === 'dl') {
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl') || siteRaw.includes('delhi')) return true;
        }
        
        if (filterLower.includes('uttar pradesh') || filterLower === 'up') {
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up') || siteRaw.includes('uttar pradesh') || siteRaw.includes('up')) return true;
        }

        if (filterLower.includes('haryana') || filterLower === 'hr') {
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr') || siteRaw.includes('haryana')) return true;
        }

        return siteRaw.includes(filterLower) || (t.Location && t.Location.toLowerCase().includes(filterLower));
      });

      // Calculate Annexure Data
      const selectedStateAdhoc = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null') 
        ? String(locationId).trim() 
        : '';

      const annexureData = trips.map((t: any, index: number) => {
        const rawHub = t.CustomerSite || t.CustSite || t.Location || '';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const locMatch = rawHub.match(/^([A-Z]{2})\s*-\s*/i);
        const cleanLoc = selectedStateAdhoc || (locMatch ? locMatch[1].toUpperCase() : (t.State || t.Location || 'UP'));

        return {
          id: index + 1,
          date: t.date || '',
          hub: cleanHub,
          loc: cleanLoc,
          vendor: 'COGENT LOGISTICS PRIVATE LIMITED',
          vehNo: t.VehicleNumber || '',
          vehType: t.VehicleType || '',
          parentVeh: t.VehicleNumber || '',
          ownType: 'Adhoc',
          driverType: t.DriverType || 'Driver',
          inTime: t.ArrivalTimeAtHub || '',
          outTime: t.OutTimeFromHub || '',
          startOdo: t.OpeningKM || 0,
          endOdo: t.ClosingKM || 0,
          dist: (t.ClosingKM || 0) - (t.OpeningKM || 0),
          location: cleanLoc,
          vehicleNumber: t.VehicleNumber || '',
          vehicleType: t.VehicleType || '',
          vehicleOwnership: 'Adhoc',
          tripType: t.TripType || 'Adhoc',
          startOdometer: t.OpeningKM || 0,
          endOdometer: t.ClosingKM || 0,
          distance: (t.ClosingKM || 0) - (t.OpeningKM || 0),
          extraKm: t.ExtraKM ? parseFloat(t.ExtraKM) : 0,
          extraKmRate: t.ExtraKM && t.ExtraKMCost ? (parseFloat(t.ExtraKMCost) / parseFloat(t.ExtraKM)).toFixed(2) : 0,
          fixCost: t.VFreightFix || 0
        };
      });

      // Calculate MIS Data
      const misGroups: any = {};
      trips.forEach((t: any) => {
        const rawHub = t.CustomerSite || t.CustSite || t.Location || 'Unknown';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const loc = cleanHub || 'Unknown';

        const dist = (parseFloat(t.ClosingKM) || 0) - (parseFloat(t.OpeningKM) || 0);
        const tripExtraKm = t.ExtraKM ? parseFloat(t.ExtraKM) : 0;

        const vehComm = commercialRows.find((c: any) => {
          const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
          const vehMatches = !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
          return stateMatches && vehMatches;
        }) || commercialRows.find((c: any) => {
          return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
        }) || commercialRows.find((c: any) => {
          return !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
        }) || commercialRates;

        if (!misGroups[loc]) {
          const rawFixed = vehComm?.fixed_rate ? parseFloat(vehComm.fixed_rate) : (t.VFreightFix ? parseFloat(t.VFreightFix) : 0);
          const fixedRateVal = isNaN(rawFixed) ? 0 : rawFixed;

          const rawAddRate = vehComm?.additional_rate_per_km ? parseFloat(vehComm.additional_rate_per_km) : (t.ExtraKMCost && t.ExtraKM && parseFloat(t.ExtraKM) > 0 ? parseFloat(t.ExtraKMCost) / parseFloat(t.ExtraKM) : 0);
          const addKmRateVal = isNaN(rawAddRate) ? 0 : rawAddRate;

          misGroups[loc] = {
            location: loc,
            noOfTrips: 0,
            rates: fixedRateVal,
            extraKm: 0,
            extraKmRate: addKmRateVal,
            extraHrsRate: vehComm?.over_time_charges ? parseFloat(vehComm.over_time_charges) : 63,
            fixedCost: 0,
            extraKmCost: 0,
            dcmCharges: 0,
            totalAmount: 0
          };
        }
        
        misGroups[loc].noOfTrips += 1;
        misGroups[loc].extraKm += tripExtraKm;
        misGroups[loc].dcmCharges += (parseFloat(t.DCMCharges) || 0);
      });
      
      const misData = Object.values(misGroups).map((m: any, idx: number) => {
        const safeRates = isNaN(m.rates) ? 0 : m.rates;
        const safeExtraKmRate = isNaN(m.extraKmRate) ? 0 : m.extraKmRate;
        const fixedCost = safeRates * (m.noOfTrips || 0);
        const extraKmCost = safeExtraKmRate * (m.extraKm || 0);
        const dcmCharges = isNaN(m.dcmCharges) ? 0 : m.dcmCharges;
        const totalAmount = fixedCost + extraKmCost + dcmCharges;

        return {
          id: idx + 1,
          ...m,
          rates: safeRates,
          fixedCost: Number(fixedCost.toFixed(2)),
          extraKmCost: Number(extraKmCost.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          extraKmRate: Number(safeExtraKmRate).toFixed(2)
        };
      });

      res.json({
        misData,
        annexureData,
        vendorInfo
      });
    } else if (tripType === 'fixed') {
      // Fetch all trips for this vendor in the date range
      const [rawTrips]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%d/%m/%Y') as date,
          ft.Location, ft.CustomerSite, ft.VendorName, ft.VehicleNumber, ft.VehicleType, ft.TripType, 
          'Driver' as DriverType,
          p.State as ProjectState, p.LocationsJSON,
          COALESCE(ft.ArrivalTimeAtHub, ft.InTimeByCust, ft.VehicleEntryInHub, ft.VehicleReportingAtHub) as ArrivalTimeAtHub, 
          COALESCE(ft.OutTimeFromHub, ft.VehicleReturnAtHub, ReturnReportingTime, ft.OutTimeFrom) as OutTimeFromHub, 
          ft.TotalDutyHours,
          ft.OpeningKM, ft.ClosingKM, ft.VFreightFix, ft.TotalFreight, ft.TollExpenses, ft.ParkingCharges,
          vc.fixed_rate as vc_fixed_rate,
          vc.additional_rate_per_km as vc_additional_rate_per_km,
          vc.km_include_in_fix_rate as vc_km_include,
          vc.no_of_days_per_month as vc_no_of_days_per_month,
          vc.hours as vc_hours,
          vc.over_time_charges as vc_over_time_charges,
          vc.state as vc_state
        FROM fixed_transactions ft
        LEFT JOIN project p ON p.ProjectID = ft.ProjectID
        LEFT JOIN vendor_commercial vc ON ft.vendor_commercial_id = vc.id
        WHERE (ft.VendorName = ? OR ft.VendorID = ? OR (ft.VendorName IS NOT NULL AND ft.VendorName LIKE CONCAT('%', ?, '%'))) 
          AND DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%Y-%m-%d') BETWEEN ? AND ?
          AND (? IS NULL OR ? = '' OR ft.CustomerID = ? OR (ft.CompanyName IS NOT NULL AND ft.CompanyName LIKE CONCAT('%', ?, '%')))
          AND (? IS NULL OR ? = '' OR ft.ProjectID = ? OR p.ProjectName IN (SELECT ProjectName FROM project WHERE ProjectID = ?))
      `, [
        actualVendorName, vendorName, actualVendorName,
        startDate, endDate,
        custIdVal, custIdVal, custIdVal, custIdVal,
        projIdVal, projIdVal, projIdVal, projIdVal
      ]);

      const trips = rawTrips.filter((t: any) => {
        if (!stateFilter) return true;
        const filterLower = stateFilter.toLowerCase();

        if (t.vc_state) {
          return t.vc_state.toLowerCase().includes(filterLower);
        }

        if (t.LocationsJSON) {
          try {
            const locArray = JSON.parse(t.LocationsJSON);
            const siteRaw = (t.CustomerSite || t.Location || '').toLowerCase();
            const matchedEntry = locArray.find((item: any) => {
              const loc = (item.Location || '').toLowerCase();
              const site = (item.CustomerSite || '').toLowerCase();
              return (loc && siteRaw.includes(loc)) || (site && siteRaw.includes(site));
            });
            if (matchedEntry && matchedEntry.State) {
              return matchedEntry.State.toLowerCase().includes(filterLower);
            }
          } catch (e) {}
        }

        const siteRaw = (t.CustomerSite || t.Location || '').toLowerCase();
        const upCities = ['noida', 'lucknow', 'ghaziabad', 'kanpur', 'agra', 'varanasi', 'meerut', 'greater noida', 'rampur', 'aligarh', 'bareilly', 'moradabad'];
        const dlCities = ['dwarka', 'delhi', 'janakpuri', 'okhla', 'rohini', 'mayapuri', 'azadpur', 'kapashera', 'narela', 'rajiv chowk', 'ram nagar'];
        const hrCities = ['gurgaon', 'gurugram', 'faridabad', 'manesar', 'sonipat', 'panipat', 'karnal', 'palwal', 'rewari', 'bahadurgarh', 'ambala', 'hisar', 'rohtak'];

        if (filterLower.includes('delhi') || filterLower === 'dl') {
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl') || siteRaw.includes('delhi')) return true;
        }
        
        if (filterLower.includes('uttar pradesh') || filterLower === 'up') {
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr')) return false;
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up') || siteRaw.includes('uttar pradesh') || siteRaw.includes('up')) return true;
        }

        if (filterLower.includes('haryana') || filterLower === 'hr') {
          if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl')) return false;
          if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up')) return false;
          if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr') || siteRaw.includes('haryana')) return true;
        }

        return siteRaw.includes(filterLower) || (t.Location && t.Location.toLowerCase().includes(filterLower));
      });

      // Calculate Annexure Data (Detailed Logs)
      const selectedState = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null') 
        ? String(locationId).trim() 
        : '';

      const annexureData = trips.map((t: any, index: number) => {
        const rawHub = t.CustomerSite || t.Location || '';
        const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
        const locMatch = rawHub.match(/^([A-Z]{2})\s*-\s*/i);
        const cleanLoc = selectedState || (locMatch ? locMatch[1].toUpperCase() : (t.State || t.Location || 'UP'));

        return {
          id: index + 1,
          date: t.date || '',
          hub: cleanHub,
          loc: cleanLoc,
          vendor: 'COGENT LOGISTICS PRIVATE LIMITED',
          vehNo: t.VehicleNumber || '',
          vehType: t.VehicleType || '',
          parentVeh: t.VehicleNumber || '',
          ownType: 'Fixed',
          driverType: t.DriverType || 'Driver',
          inTime: t.ArrivalTimeAtHub || '',
          outTime: t.OutTimeFromHub || '',
          startOdo: t.OpeningKM || 0,
          endOdo: t.ClosingKM || 0,
          dist: (t.ClosingKM || 0) - (t.OpeningKM || 0)
        };
      });

      // Calculate MIS Data (Summary)
      // Grouping by Vehicle Number for Fixed MIS
      const misGroups: any = {};
      trips.forEach((t: any) => {
        const veh = t.VehicleNumber || 'Unknown';
        if (!misGroups[veh]) {
          const vehComm = commercialRows.find((c: any) => {
            const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
            const vehMatches = !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
            return stateMatches && vehMatches;
          }) || commercialRows.find((c: any) => {
            return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
          }) || commercialRows.find((c: any) => {
            return !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
          }) || commercialRates;

          const agRate = vehComm?.fixed_rate ? parseFloat(vehComm.fixed_rate) : 34650;
          const fixedKms = vehComm?.km_include_in_fix_rate ? parseFloat(vehComm.km_include_in_fix_rate) : 1000;
          const workDays = vehComm?.no_of_days_per_month ? parseFloat(vehComm.no_of_days_per_month) : 30;
          const extKmRate = vehComm?.additional_rate_per_km ? parseFloat(vehComm.additional_rate_per_km) : 7.25;
          const dynFuel = 0.50;

          const rawHubFixed = t.CustomerSite || t.Location || '';
          const cleanHubFixed = rawHubFixed.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();

          misGroups[veh] = {
            vehNo: veh,
            vehType: t.VehicleType || '',
            mode: 'UP Large LM',
            loc: cleanHubFixed || t.Location || '',
            vertical: 'LM',
            hrs: vehComm?.hours ? parseFloat(vehComm.hours) : 12,
            fixedKms: fixedKms,
            agRate: agRate,
            dieselHike: 0,
            totWithHike: agRate,
            workDays: workDays,
            actualDays: 0,
            datesSet: new Set<string>(),
            dailyOdoMap: new Map<string, { minStart: number, maxEnd: number, totalDist: number, hasOdo: boolean }>(),
            totKms: 0,
            extHrAmt: vehComm?.over_time_charges ? parseFloat(vehComm.over_time_charges) : 60,
            extHr: 0,
            extHrRate: 0,
            extKmRate: extKmRate,
            dynFuel: dynFuel,
            totExtKmRate: extKmRate + dynFuel,
            perDayCost: agRate / (workDays || 30),
            perDayKm: fixedKms / (workDays || 30),
            actualDeployed: 0,
            extKm: 0,
            extKmCharge: 0,
            totalAmt: 0,
            toll: 0,
            dcm: 0,
            finalAmt: 0
          };
        }
        
        let tripDate = '';
        if (t.date) {
          tripDate = String(t.date);
        } else if (t.ServiceDate) {
          try {
            tripDate = new Date(t.ServiceDate).toISOString().split('T')[0];
          } catch (e) {
            tripDate = String(t.ServiceDate);
          }
        } else if (t.TransactionDate) {
          try {
            tripDate = new Date(t.TransactionDate).toISOString().split('T')[0];
          } catch (e) {
            tripDate = String(t.TransactionDate);
          }
        }

        if (tripDate && misGroups[veh].datesSet) {
          misGroups[veh].datesSet.add(tripDate);
        }

        const startKm = Number(t.OpeningKM || 0);
        const endKm = Number(t.ClosingKM || 0);
        const dist = Number(endKm > startKm ? endKm - startKm : (t.Distance || 0));

        if (tripDate && misGroups[veh].dailyOdoMap) {
          if (!misGroups[veh].dailyOdoMap.has(tripDate)) {
            misGroups[veh].dailyOdoMap.set(tripDate, {
              minStart: startKm,
              maxEnd: endKm,
              totalDist: dist,
              hasOdo: (startKm > 0 || endKm > 0)
            });
          } else {
            const dayData = misGroups[veh].dailyOdoMap.get(tripDate)!;
            if (startKm > 0 || endKm > 0) {
              dayData.minStart = dayData.minStart === 0 ? startKm : Math.min(dayData.minStart, startKm);
              dayData.maxEnd = Math.max(dayData.maxEnd, endKm);
              dayData.hasOdo = true;
            } else {
              dayData.totalDist += dist;
            }
          }
        }

        misGroups[veh].actualDays = misGroups[veh].datesSet ? misGroups[veh].datesSet.size : (misGroups[veh].actualDays + 1);
        misGroups[veh].extKm += (Number(t.ExtraKM) || 0);
        misGroups[veh].extKmCharge += (Number(t.ExtraKMCost) || 0);
        misGroups[veh].toll += ((Number(t.TollExpenses) || 0) + (Number(t.ParkingCharges) || 0));
        misGroups[veh].dcm += (Number(t.DCMCharges) || 0);

        // Calculate extra hours if duty hours exceed package hours (default 12)
        const packageHrs = misGroups[veh].hrs || 12;
        let tripDutyHrs = Number(t.TotalDutyHours || 0);
        if (!tripDutyHrs && t.ArrivalTimeAtHub && t.OutTimeFromHub) {
          const inParts = String(t.ArrivalTimeAtHub).split(':').map(Number);
          const outParts = String(t.OutTimeFromHub).split(':').map(Number);
          if (inParts.length >= 2 && outParts.length >= 2 && !isNaN(inParts[0]) && !isNaN(outParts[0])) {
            const inMins = inParts[0] * 60 + (inParts[1] || 0);
            const outMins = outParts[0] * 60 + (outParts[1] || 0);
            const diffMins = outMins >= inMins ? outMins - inMins : (24 * 60 - inMins) + outMins;
            tripDutyHrs = diffMins / 60;
          }
        }
        if (tripDutyHrs > packageHrs) {
          misGroups[veh].extHr += (tripDutyHrs - packageHrs);
        }
      });
      
      const misData = Object.values(misGroups).map((m: any, idx: number) => {
        let computedTotalKMs = 0;
        if (m.dailyOdoMap) {
          m.dailyOdoMap.forEach((dayData: any) => {
            if (dayData.hasOdo && dayData.maxEnd >= dayData.minStart && dayData.maxEnd > 0) {
              computedTotalKMs += (dayData.maxEnd - dayData.minStart);
            } else {
              computedTotalKMs += (dayData.totalDist || 0);
            }
          });
        } else {
          computedTotalKMs = m.totKms;
        }

        const actualDays = m.datesSet && m.datesSet.size > 0 ? m.datesSet.size : (m.actualDays || 0);
        delete m.datesSet;
        delete m.dailyOdoMap;

        const extKm = Math.max(0, computedTotalKMs - (actualDays * m.perDayKm));
        const extKmCharge = extKm * m.totExtKmRate;
        const actualDeployed = m.perDayCost * actualDays;
        const totalAmt = extKmCharge + actualDeployed;
        const extHrCharges = m.extHr * m.extHrAmt;
        const finalAmt = extHrCharges + m.dcm + m.toll + totalAmt;

        return {
          id: idx + 1,
          ...m,
          actualDays: actualDays,
          extHrRate: Number(extHrCharges).toFixed(2),
          perDayCost: Number(m.perDayCost).toFixed(2),
          perDayKm: Number(m.perDayKm).toFixed(2),
          extKm: Number(extKm).toFixed(2),
          extKmCharge: Number(extKmCharge).toFixed(2),
          actualDeployed: Number(actualDeployed).toFixed(2),
          totalAmt: Number(totalAmt).toFixed(2),
          finalAmt: Number(finalAmt).toFixed(2)
        };
      });

      res.json({
        misData,
        annexureData,
        vendorInfo
      });
    } else {
      res.json({ misData: [], annexureData: [], vendorInfo });
    }
  } catch (error) {
    console.error('Error fetching vendor trips:', error);
    res.status(500).json({ error: 'Failed to fetch vendor trips' });
  }
};

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const invoiceNumber = await generateVendorInvoiceNumber();
    res.json({ invoiceNumber });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    res.status(500).json({ error: 'Failed to generate invoice number' });
  }
};

export const saveVendorInvoice = async (req: Request, res: Response) => {
  try {
    const { vendorName, amount, linkedCustomerInvoice, financialYear, html, invoiceDate, dueDate } = req.body;

    if (!vendorName || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fy = financialYear || '26-27';
    const invoiceNumber = await generateVendorInvoiceNumber();

    let finalAzureUrl = null;

    if (html) {
      try {
        let browser;
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = (await import('@sparticuz/chromium')).default;
          const puppeteerCore = (await import('puppeteer-core')).default;
          browser = await puppeteerCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          });
        } else {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          browser = await puppeteer.launch({ headless: true });
        }
        const page = await browser.newPage();
        const processedHtml = html.replace(/VN\/26-27\/\d+/gi, invoiceNumber);
        await page.setContent(processedHtml, { waitUntil: 'networkidle0' as any });
        await page.emulateMediaType('print');
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });
        await browser.close();

        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME || 'tmsfiles');
        await containerClient.createIfNotExists();

        const blobName = `vendor-invoices/${invoiceNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
          blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });

        finalAzureUrl = blockBlobClient.url;
      } catch (error) {
        console.error('Failed to generate PDF or upload to Azure:', error);
        throw error;
      }
    } else if (req.body.azureUrl) {
      finalAzureUrl = req.body.azureUrl;
    }

    let customerInvoiceId = null;
    if (linkedCustomerInvoice) {
      const [invRows]: any = await pool.query(
        'SELECT id FROM customer_invoices WHERE invoice_number = ? LIMIT 1',
        [linkedCustomerInvoice]
      );
      if (invRows.length > 0) {
        customerInvoiceId = invRows[0].id;
      }
    }

    const insertQuery = `
      INSERT INTO vendor_invoices (
        vendor_invoice_number, vendor_name, date, due_date, amount, 
        azure_blob_url, customer_invoice_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const iDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const dDate = dueDate ? new Date(dueDate) : new Date(iDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(insertQuery, [
      invoiceNumber,
      vendorName,
      iDate,
      dDate,
      amount,
      finalAzureUrl,
      customerInvoiceId
    ]);

    res.json({ 
      success: true, 
      invoiceNumber,
      azureBlobUrl: finalAzureUrl
    });
  } catch (error) {
    console.error('Error saving vendor invoice:', error);
    res.status(500).json({ error: 'Failed to save vendor invoice' });
  }
};

export const getVendorInvoicesList = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        vi.id, 
        vi.vendor_invoice_number AS invoice_number, 
        vi.vendor_name, 
        v.VendorName AS raw_vendor_name,
        v.CompanyName AS company_name,
        v.TypeOfCompany AS type_of_company,
        v.CompanyGST AS vendor_gst,
        v.VendorMobileNo AS vendor_mobile,
        v.VendorAlternateNo AS vendor_alt_mobile,
        v.AddressOfCompany AS address_of_company,
        v.VendorAddress AS raw_vendor_address,
        v.HouseFlatNo,
        v.StreetLocality,
        v.City,
        v.State,
        v.PinCode,
        v.Country,
        vi.customer_invoice_id, 
        ci.invoice_number AS linked_customer_invoice, 
        vi.date, 
        vi.due_date, 
        vi.amount, 
        vi.status, 
        vi.azure_blob_url,
        COALESCE(v.AccountHolderName, v.CompanyName, vi.vendor_name) AS account_holder_name,
        v.AccountNumber AS account_number,
        v.IFSCCode AS ifsc_code,
        v.BankName AS bank_name,
        v.BranchName AS branch_name
      FROM vendor_invoices vi
      LEFT JOIN customer_invoices ci ON vi.customer_invoice_id = ci.id
      LEFT JOIN vendor v ON (vi.vendor_name = v.VendorName OR vi.vendor_name = v.CompanyName OR CAST(vi.vendor_name AS CHAR) = CAST(v.VendorID AS CHAR))
      ORDER BY vi.id DESC
    `);

    const formattedRows = rows.map((r: any) => {
      const companyNameStr = (r.company_name || '').trim();
      const typeOfCompStr = (r.type_of_company || '').trim();
      const vendorPersonName = (r.raw_vendor_name || r.vendor_name || '').trim();
      const resolvedCompanyName = companyNameStr 
        ? (typeOfCompStr && !companyNameStr.toLowerCase().includes(typeOfCompStr.toLowerCase()) ? `${companyNameStr} ${typeOfCompStr}` : companyNameStr)
        : vendorPersonName;

      const combinedName = (resolvedCompanyName && vendorPersonName && resolvedCompanyName.toLowerCase() !== vendorPersonName.toLowerCase())
        ? `${resolvedCompanyName} (${vendorPersonName})`
        : (resolvedCompanyName || vendorPersonName);

      const addrParts = [
        r.HouseFlatNo,
        r.StreetLocality,
        r.City,
        r.State,
        r.PinCode,
        r.Country
      ].filter((p: any) => p && String(p).trim().length > 0);

      const baseAddress = (r.raw_vendor_address && r.raw_vendor_address.trim() !== '' && r.raw_vendor_address.trim() !== ',')
        ? r.raw_vendor_address.trim()
        : (addrParts.length > 0 ? addrParts.join(', ') : (r.address_of_company || ''));

      const contacts = [r.vendor_mobile, r.vendor_alt_mobile]
        .filter((c: any) => c && String(c).trim().length > 0 && String(c).trim() !== 'null' && String(c).trim() !== 'undefined');
      const contactStr = contacts.length > 0 ? `Ph: ${contacts.join(' / ')}` : '';
      const addressWithContact = [baseAddress, contactStr].filter(Boolean).join(' | ');

      return {
        ...r,
        company_name: combinedName,
        raw_company_name: resolvedCompanyName,
        vendor_person_name: vendorPersonName,
        vendor_address: addressWithContact || baseAddress,
        vendor_address_raw: baseAddress
      };
    });

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({ error: 'Failed to fetch vendor invoices' });
  }
};
export const saveVendorCNDN = async (req: Request, res: Response) => {
  try {
    const { noteNumber, type, vendorInvoiceRef, amount, date, reason, remarks, html } = req.body;

    if (!noteNumber || !type || !vendorInvoiceRef || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let finalAzureUrl = null;

    if (html) {
      try {
        let browser;
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = (await import('@sparticuz/chromium')).default;
          const puppeteerCore = (await import('puppeteer-core')).default;
          browser = await puppeteerCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
          });
        } else {
          const puppeteerModule = await import('puppeteer');
          const puppeteer = puppeteerModule.default || puppeteerModule;
          browser = await puppeteer.launch({ headless: true });
        }
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        await page.emulateMediaType('print');
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' }
        });
        await browser.close();

        const blobServiceClient = getBlobServiceClient();
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME || 'tmsfiles');
        await containerClient.createIfNotExists();

        const blobName = `vendor-cndn/${noteNumber.replace(/\//g, '_')}_${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(Buffer.from(pdfBuffer), {
          blobHTTPHeaders: { blobContentType: 'application/pdf' }
        });

        finalAzureUrl = blockBlobClient.url;
      } catch (error) {
        console.error('Failed to generate PDF or upload to Azure:', error);
        throw error;
      }
    }

    const insertQuery = `
      INSERT INTO vendor_cndn_notes (
        note_number, type, vendor_invoice_ref, amount, date, reason, remarks, azure_blob_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const cndnDate = date ? new Date(date) : new Date();

    await pool.query(insertQuery, [
      noteNumber,
      type,
      vendorInvoiceRef,
      amount,
      cndnDate,
      reason,
      remarks,
      finalAzureUrl
    ]);

    res.json({ 
      success: true, 
      noteNumber,
      azureBlobUrl: finalAzureUrl
    });
  } catch (error) {
    console.error('Error saving vendor CN/DN:', error);
    res.status(500).json({ error: 'Failed to save vendor CN/DN' });
  }
};

export const getVendorCNDNList = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        cndn.id, 
        cndn.note_number AS noteNumber, 
        cndn.type, 
        cndn.vendor_invoice_ref AS invoiceRef, 
        cndn.amount, 
        cndn.date, 
        cndn.reason, 
        cndn.remarks, 
        cndn.azure_blob_url, 
        cndn.status,
        vi.vendor_name AS customerOrVendor
      FROM vendor_cndn_notes cndn
      LEFT JOIN vendor_invoices vi ON cndn.vendor_invoice_ref = vi.vendor_invoice_number
      ORDER BY cndn.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendor CN/DN notes:', error);
    res.status(500).json({ error: 'Failed to fetch vendor CN/DN notes' });
  }
};

export const ensureVendorBankPaymentSheetTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS VendorBankPaymentSheet (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id VARCHAR(100) NOT NULL,
        excel_name VARCHAR(255) NOT NULL,
        month VARCHAR(50) NULL,
        date_from VARCHAR(50) NULL,
        date_to VARCHAR(50) NULL,
        transaction_type VARCHAR(50) DEFAULT 'IFC',
        debit_account_no VARCHAR(50) DEFAULT '163905500140',
        ifsc_code VARCHAR(50) DEFAULT 'ICIC0000011',
        beneficiary_account_no VARCHAR(100) NULL,
        beneficiary_name VARCHAR(255) NULL,
        amount DECIMAL(15,2) DEFAULT 0.00,
        remarks_client VARCHAR(255) DEFAULT 'VENDOR',
        remarks_beneficiary VARCHAR(255) NULL,
        output_text TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_batch_id (batch_id),
        INDEX idx_excel_name (excel_name),
        INDEX idx_created_at (created_at)
      )
    `);
  } catch (e) {
    console.error('Error ensuring VendorBankPaymentSheet table:', e);
  }
};

export const saveVendorBankPaymentSheet = async (req: Request, res: Response) => {
  try {
    await ensureVendorBankPaymentSheetTable();

    const { excelName, month, dateFrom, dateTo, rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No rows provided to save' });
    }

    const batchId = `BATCH_VENDOR_${Date.now()}`;
    const defaultExcelName = excelName || `Vendor_Payment_Bank_Format_${batchId}.xlsx`;

    const insertValues = rows.map((r: any) => {
      const txnType = r.transactionType || 'IFC';
      const debitAcc = r.debitAccountNo || '163905500140';
      const ifsc = r.ifscCode || 'ICIC0000011';
      const accNo = r.beneficiaryAccountNo || '';
      const bName = r.beneficiaryName || '';
      const amt = Number(r.amount) || 0;
      const remClient = (r.remarksClient || 'VENDOR').substring(0, 21);
      const remBeneficiary = (r.remarksBeneficiary || 'Vendor Payment').substring(0, 30);
      
      const isWib = txnType.toUpperCase() === 'WIB';
      const prefix = isWib ? 'APW' : 'APO';
      const outputText = r.outputText || `${prefix}|${txnType}|${Math.round(amt * 100) / 100}|INR|${debitAcc}|0011|${ifsc}|${accNo}|0011|${bName}|${remClient}|${remBeneficiary}^`;

      return [
        batchId,
        defaultExcelName,
        month || '',
        dateFrom || '',
        dateTo || '',
        txnType,
        debitAcc,
        ifsc,
        accNo,
        bName,
        amt,
        remClient,
        remBeneficiary,
        outputText
      ];
    });

    const sql = `
      INSERT INTO VendorBankPaymentSheet (
        batch_id,
        excel_name,
        month,
        date_from,
        date_to,
        transaction_type,
        debit_account_no,
        ifsc_code,
        beneficiary_account_no,
        beneficiary_name,
        amount,
        remarks_client,
        remarks_beneficiary,
        output_text
      ) VALUES ?
    `;

    await pool.query(sql, [insertValues]);

    res.status(201).json({
      success: true,
      message: 'Vendor bank payment sheet saved successfully',
      batchId,
      excelName: defaultExcelName,
      totalEntries: rows.length
    });
  } catch (error: any) {
    console.error('Error saving vendor bank payment sheet:', error);
    res.status(500).json({ message: 'Failed to save vendor bank payment sheet', error: error.message });
  }
};

export const getVendorBankPaymentSheets = async (req: Request, res: Response) => {
  try {
    await ensureVendorBankPaymentSheetTable();

    const [rows]: any = await pool.query(`
      SELECT 
        batch_id as batchId,
        excel_name as excelName,
        month,
        date_from as dateFrom,
        date_to as dateTo,
        COUNT(*) as totalEntries,
        SUM(amount) as totalAmount,
        MIN(created_at) as createdAt,
        MAX(updated_at) as updatedAt
      FROM VendorBankPaymentSheet
      GROUP BY batch_id, excel_name, month, date_from, date_to
      ORDER BY MIN(created_at) DESC
    `);

    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching vendor bank payment sheets:', error);
    res.status(500).json({ message: 'Failed to fetch vendor bank payment sheets', error: error.message });
  }
};

export const getVendorBankPaymentSheetBatch = async (req: Request, res: Response) => {
  try {
    await ensureVendorBankPaymentSheetTable();

    const { batchId } = req.params;
    const [rows]: any = await pool.query(
      `SELECT * FROM VendorBankPaymentSheet WHERE batch_id = ? ORDER BY id ASC`,
      [batchId]
    );

    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching vendor batch rows:', error);
    res.status(500).json({ message: 'Failed to fetch vendor batch rows', error: error.message });
  }
};

