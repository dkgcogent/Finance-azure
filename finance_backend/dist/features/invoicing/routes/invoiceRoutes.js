"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceRoutes = void 0;
const express_1 = require("express");
const invoiceController_1 = require("../controllers/invoiceController");
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
// Need to parse large HTML payload for PDF generation
router.post('/', express_2.default.json({ limit: '50mb' }), invoiceController_1.invoiceController.createInvoice);
router.get('/', invoiceController_1.invoiceController.getInvoices);
router.post('/cndn/save', express_2.default.json({ limit: '50mb' }), invoiceController_1.invoiceController.saveCustomerCNDN);
router.get('/cndn/list', invoiceController_1.invoiceController.getCustomerCNDNList);
router.get('/global-master', invoiceController_1.invoiceController.getGlobalInvoiceMaster);
router.post('/global-master/save', invoiceController_1.invoiceController.saveGlobalInvoiceMaster);
router.get('/customers', invoiceController_1.invoiceController.getCustomers);
router.get('/projects', invoiceController_1.invoiceController.getProjects);
router.get('/locations', invoiceController_1.invoiceController.getLocations);
router.post('/generate-reports', invoiceController_1.invoiceController.generateReports);
exports.invoiceRoutes = router;
