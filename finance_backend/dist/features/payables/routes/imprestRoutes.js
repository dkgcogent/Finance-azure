"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imprestController_1 = require("../controllers/imprestController");
const auth_1 = require("../../../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth middleware to all imprest routes
router.use(auth_1.authenticateToken);
router.post('/', imprestController_1.imprestController.createImprest);
router.get('/', imprestController_1.imprestController.getImprests);
router.get('/tms-data', imprestController_1.imprestController.getTmsData);
router.put('/:id/status', imprestController_1.imprestController.updateImprestStatus);
// Bank Payment Sheet storage & history routes
router.post('/bank-payment-sheets', imprestController_1.imprestController.saveBankPaymentSheet);
router.get('/bank-payment-sheets', imprestController_1.imprestController.getBankPaymentSheets);
router.get('/bank-payment-sheets/:batchId', imprestController_1.imprestController.getBankPaymentSheetBatch);
exports.default = router;
