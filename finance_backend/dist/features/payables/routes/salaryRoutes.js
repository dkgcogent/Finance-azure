"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salaryController_1 = require("../controllers/salaryController");
const auth_1 = require("../../../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth middleware to all salary routes
router.use(auth_1.authenticateToken);
router.get('/sheet', salaryController_1.salaryController.getSalarySheet);
router.get('/pending-approvals', salaryController_1.salaryController.getPendingApprovals);
router.put('/sheets/:id/status', salaryController_1.salaryController.updateSheetStatus);
// Salary Bank Payment Sheet routes
router.post('/bank-payment-sheets', salaryController_1.salaryController.saveBankPaymentSheet);
router.get('/bank-payment-sheets', salaryController_1.salaryController.getBankPaymentSheets);
router.get('/bank-payment-sheets/:batchId', salaryController_1.salaryController.getBankPaymentSheetBatch);
exports.default = router;
