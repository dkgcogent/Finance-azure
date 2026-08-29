"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorCNDNList = exports.saveVendorCNDN = exports.getVendorInvoicesList = exports.saveVendorInvoice = exports.getNextInvoiceNumber = exports.getVendorTrips = exports.getVendors = void 0;
const database_1 = require("../../../config/database");
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getBlobServiceClient = () => {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('Azure Storage Connection string not found');
    }
    return storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
};
const generateVendorInvoiceNumber = async () => {
    const fy = '26-27';
    const [rows] = await database_1.db.query(`SELECT vendor_invoice_number FROM vendor_invoices 
     ORDER BY id DESC LIMIT 1`);
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
const getVendors = async (req, res) => {
    try {
        const [rows] = await database_1.db.query(`
      SELECT VendorID as id, VendorName as name, TypeOfCompany as type
      FROM vendor 
      WHERE Status = 'active' OR Status = 'Active' OR Status IS NULL
      ORDER BY VendorName ASC
    `);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};
exports.getVendors = getVendors;
const getVendorTrips = async (req, res) => {
    try {
        const { vendorName, startDate, endDate, tripType, customerId, projectId, locationId } = req.query;
        if (!vendorName || !startDate || !endDate) {
            return res.status(400).json({ error: 'vendorName, startDate, and endDate are required' });
        }
        // First get the vendor details
        const [vendorRows] = await database_1.db.query('SELECT VendorName, VendorAddress, AccountHolderName, AccountNumber, IFSCCode, BankName, BranchName FROM vendor WHERE VendorID = ?', [vendorName]);
        if (vendorRows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendorInfo = vendorRows[0];
        const actualVendorName = vendorInfo.VendorName;
        // Fetch commercial rates
        const placementType = tripType === 'adhoc' ? 'Adhoc' : 'Fixed';
        const stateFilter = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null')
            ? String(locationId).trim()
            : null;
        const [commercialRows] = await database_1.db.query(`SELECT * FROM vendor_commercial 
       WHERE (vendor_name = ? OR vendor_id = ? OR (vendor_name IS NOT NULL AND vendor_name LIKE CONCAT('%', ?, '%'))) 
       ORDER BY 
         (CASE WHEN ? IS NOT NULL AND (LOWER(state) = LOWER(?) OR LOWER(state) LIKE CONCAT('%', LOWER(?), '%')) THEN 0 ELSE 1 END),
         (CASE WHEN LOWER(type_of_vehicle_placement) = LOWER(?) THEN 0 ELSE 1 END), 
         id DESC`, [actualVendorName, vendorName, actualVendorName, stateFilter, stateFilter, stateFilter, placementType]);
        const commercialRates = commercialRows.length > 0 ? commercialRows[0] : null;
        const custIdVal = customerId ? String(customerId) : null;
        const projIdVal = projectId ? String(projectId) : null;
        if (tripType === 'adhoc') {
            // Fetch all trips for this vendor in the date range
            const [rawTrips] = await database_1.db.query(`
        SELECT 
          DATE_FORMAT(COALESCE(at.ServiceDate, at.TransactionDate), '%d/%m/%Y') as date,
          at.Location, at.CustomerSite, at.CustSite, at.VendorName, at.VehicleNumber, at.VehicleType, at.VehicleOwnershipType, at.TripType, at.DriverType, 
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
            const trips = rawTrips.filter((t) => {
                if (!stateFilter)
                    return true;
                const filterLower = stateFilter.toLowerCase();
                if (t.vc_state) {
                    return t.vc_state.toLowerCase().includes(filterLower);
                }
                const siteRaw = (t.CustomerSite || t.CustSite || t.Location || '').toLowerCase();
                const upCities = ['noida', 'lucknow', 'ghaziabad', 'kanpur', 'agra', 'varanasi', 'meerut', 'greater noida'];
                const dlCities = ['dwarka', 'delhi', 'janakpuri', 'okhla', 'rohini', 'mayapuri', 'azadpur', 'kapashera', 'narela'];
                const hrCities = ['gurgaon', 'gurugram', 'faridabad', 'manesar', 'sonipat', 'panipat', 'karnal'];
                if (filterLower.includes('delhi') || filterLower === 'dl') {
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr'))
                        return false;
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl') || siteRaw.includes('delhi'))
                        return true;
                }
                if (filterLower.includes('uttar pradesh') || filterLower === 'up') {
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr'))
                        return false;
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up') || siteRaw.includes('uttar pradesh') || siteRaw.includes('up'))
                        return true;
                }
                if (filterLower.includes('haryana') || filterLower === 'hr') {
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl'))
                        return false;
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr') || siteRaw.includes('haryana'))
                        return true;
                }
                return siteRaw.includes(filterLower) || (t.Location && t.Location.toLowerCase().includes(filterLower));
            });
            // Calculate Annexure Data
            const selectedStateAdhoc = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null')
                ? String(locationId).trim()
                : '';
            const annexureData = trips.map((t, index) => {
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
                    extraKm: Math.max(0, ((t.ClosingKM || 0) - (t.OpeningKM || 0)) - 100),
                    extraKmRate: t.ExtraKM && t.ExtraKMCost ? (t.ExtraKMCost / t.ExtraKM).toFixed(2) : 0,
                    fixCost: t.VFreightFix || 0
                };
            });
            // Calculate MIS Data
            const misGroups = {};
            trips.forEach((t) => {
                const rawHub = t.CustomerSite || t.CustSite || t.Location || 'Unknown';
                const cleanHub = rawHub.replace(/^[A-Z]{2}\s*-\s*/i, '').replace(/\s*\(Emp:.*?\)/gi, '').trim();
                const loc = cleanHub || 'Unknown';
                const dist = (parseFloat(t.ClosingKM) || 0) - (parseFloat(t.OpeningKM) || 0);
                const tripExtraKm = Math.max(0, dist - 100);
                const vehComm = commercialRows.find((c) => {
                    const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
                    const vehMatches = !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
                    return stateMatches && vehMatches;
                }) || commercialRows.find((c) => {
                    return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
                }) || commercialRows.find((c) => {
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
            const misData = Object.values(misGroups).map((m, idx) => {
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
        }
        else if (tripType === 'fixed') {
            // Fetch all trips for this vendor in the date range
            const [rawTrips] = await database_1.db.query(`
        SELECT 
          DATE_FORMAT(COALESCE(ft.ServiceDate, ft.TransactionDate), '%d/%m/%Y') as date,
          ft.Location, ft.CustomerSite, ft.VendorName, ft.VehicleNumber, ft.VehicleType, ft.TripType, 
          'Driver' as DriverType,
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
            const trips = rawTrips.filter((t) => {
                if (!stateFilter)
                    return true;
                const filterLower = stateFilter.toLowerCase();
                if (t.vc_state) {
                    return t.vc_state.toLowerCase().includes(filterLower);
                }
                const siteRaw = (t.CustomerSite || t.Location || '').toLowerCase();
                const upCities = ['noida', 'lucknow', 'ghaziabad', 'kanpur', 'agra', 'varanasi', 'meerut', 'greater noida'];
                const dlCities = ['dwarka', 'delhi', 'janakpuri', 'okhla', 'rohini', 'mayapuri', 'azadpur', 'kapashera', 'narela'];
                const hrCities = ['gurgaon', 'gurugram', 'faridabad', 'manesar', 'sonipat', 'panipat', 'karnal'];
                if (filterLower.includes('delhi') || filterLower === 'dl') {
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr'))
                        return false;
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl') || siteRaw.includes('delhi'))
                        return true;
                }
                if (filterLower.includes('uttar pradesh') || filterLower === 'up') {
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr'))
                        return false;
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up') || siteRaw.includes('uttar pradesh') || siteRaw.includes('up'))
                        return true;
                }
                if (filterLower.includes('haryana') || filterLower === 'hr') {
                    if (dlCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('dl'))
                        return false;
                    if (upCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('up'))
                        return false;
                    if (hrCities.some(c => siteRaw.includes(c)) || siteRaw.startsWith('hr') || siteRaw.includes('haryana'))
                        return true;
                }
                return siteRaw.includes(filterLower) || (t.Location && t.Location.toLowerCase().includes(filterLower));
            });
            // Calculate Annexure Data (Detailed Logs)
            const selectedState = (locationId && String(locationId).trim() && String(locationId) !== 'undefined' && String(locationId) !== 'null')
                ? String(locationId).trim()
                : '';
            const annexureData = trips.map((t, index) => {
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
            const misGroups = {};
            trips.forEach((t) => {
                const veh = t.VehicleNumber || 'Unknown';
                if (!misGroups[veh]) {
                    const vehComm = commercialRows.find((c) => {
                        const stateMatches = !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
                        const vehMatches = !t.VehicleType || !c.type_of_vehicle || c.type_of_vehicle.toLowerCase() === t.VehicleType.toLowerCase();
                        return stateMatches && vehMatches;
                    }) || commercialRows.find((c) => {
                        return !stateFilter || !c.state || c.state.toLowerCase().includes(stateFilter.toLowerCase());
                    }) || commercialRows.find((c) => {
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
                misGroups[veh].actualDays += 1;
                misGroups[veh].actualDeployed += 1;
                misGroups[veh].totKms += ((Number(t.ClosingKM) || 0) - (Number(t.OpeningKM) || 0));
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
            const misData = Object.values(misGroups).map((m, idx) => {
                const extKm = Math.max(0, m.totKms - (m.actualDays * m.perDayKm));
                const extKmCharge = extKm * m.totExtKmRate;
                const actualDeployed = m.perDayCost * m.actualDays;
                const totalAmt = extKmCharge + actualDeployed;
                const extHrCharges = m.extHr * m.extHrAmt;
                const finalAmt = extHrCharges + m.dcm + m.toll + totalAmt;
                return {
                    id: idx + 1,
                    ...m,
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
        }
        else {
            res.json({ misData: [], annexureData: [], vendorInfo });
        }
    }
    catch (error) {
        console.error('Error fetching vendor trips:', error);
        res.status(500).json({ error: 'Failed to fetch vendor trips' });
    }
};
exports.getVendorTrips = getVendorTrips;
const getNextInvoiceNumber = async (req, res) => {
    try {
        const invoiceNumber = await generateVendorInvoiceNumber();
        res.json({ invoiceNumber });
    }
    catch (error) {
        console.error('Error generating invoice number:', error);
        res.status(500).json({ error: 'Failed to generate invoice number' });
    }
};
exports.getNextInvoiceNumber = getNextInvoiceNumber;
const saveVendorInvoice = async (req, res) => {
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
                    const chromium = (await Promise.resolve().then(() => __importStar(require('@sparticuz/chromium')))).default;
                    const puppeteerCore = (await Promise.resolve().then(() => __importStar(require('puppeteer-core')))).default;
                    browser = await puppeteerCore.launch({
                        args: chromium.args,
                        executablePath: await chromium.executablePath(),
                        headless: true,
                    });
                }
                else {
                    const puppeteerModule = await Promise.resolve().then(() => __importStar(require('puppeteer')));
                    const puppeteer = puppeteerModule.default || puppeteerModule;
                    browser = await puppeteer.launch({ headless: true });
                }
                const page = await browser.newPage();
                const processedHtml = html.replace(/VN\/26-27\/\d+/gi, invoiceNumber);
                await page.setContent(processedHtml, { waitUntil: 'networkidle0' });
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
            }
            catch (error) {
                console.error('Failed to generate PDF or upload to Azure:', error);
                throw error;
            }
        }
        else if (req.body.azureUrl) {
            finalAzureUrl = req.body.azureUrl;
        }
        let customerInvoiceId = null;
        if (linkedCustomerInvoice) {
            const [invRows] = await database_1.db.query('SELECT id FROM customer_invoices WHERE invoice_number = ? LIMIT 1', [linkedCustomerInvoice]);
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
        await database_1.db.query(insertQuery, [
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
    }
    catch (error) {
        console.error('Error saving vendor invoice:', error);
        res.status(500).json({ error: 'Failed to save vendor invoice' });
    }
};
exports.saveVendorInvoice = saveVendorInvoice;
const getVendorInvoicesList = async (req, res) => {
    try {
        const [rows] = await database_1.db.query(`
      SELECT 
        vi.id, 
        vi.vendor_invoice_number AS invoice_number, 
        vi.vendor_name, 
        vi.customer_invoice_id, 
        ci.invoice_number AS linked_customer_invoice,
        vi.date, 
        vi.due_date, 
        vi.amount, 
        vi.status, 
        vi.azure_blob_url,
        v.VendorAddress AS vendor_address,
        v.AccountHolderName AS account_holder_name,
        v.AccountNumber AS account_number,
        v.IFSCCode AS ifsc_code,
        v.BankName AS bank_name,
        v.BranchName AS branch_name
      FROM vendor_invoices vi
      LEFT JOIN customer_invoices ci ON vi.customer_invoice_id = ci.id
      LEFT JOIN vendor v ON vi.vendor_name = v.VendorName
      ORDER BY vi.id DESC
    `);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching vendor invoices:', error);
        res.status(500).json({ error: 'Failed to fetch vendor invoices' });
    }
};
exports.getVendorInvoicesList = getVendorInvoicesList;
const saveVendorCNDN = async (req, res) => {
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
                    const chromium = (await Promise.resolve().then(() => __importStar(require('@sparticuz/chromium')))).default;
                    const puppeteerCore = (await Promise.resolve().then(() => __importStar(require('puppeteer-core')))).default;
                    browser = await puppeteerCore.launch({
                        args: chromium.args,
                        executablePath: await chromium.executablePath(),
                        headless: true,
                    });
                }
                else {
                    const puppeteerModule = await Promise.resolve().then(() => __importStar(require('puppeteer')));
                    const puppeteer = puppeteerModule.default || puppeteerModule;
                    browser = await puppeteer.launch({ headless: true });
                }
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
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
            }
            catch (error) {
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
        await database_1.db.query(insertQuery, [
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
    }
    catch (error) {
        console.error('Error saving vendor CN/DN:', error);
        res.status(500).json({ error: 'Failed to save vendor CN/DN' });
    }
};
exports.saveVendorCNDN = saveVendorCNDN;
const getVendorCNDNList = async (req, res) => {
    try {
        const [rows] = await database_1.db.query(`
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
    }
    catch (error) {
        console.error('Error fetching vendor CN/DN notes:', error);
        res.status(500).json({ error: 'Failed to fetch vendor CN/DN notes' });
    }
};
exports.getVendorCNDNList = getVendorCNDNList;
