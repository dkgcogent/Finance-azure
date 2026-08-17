"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salaryController_1 = require("../controllers/salaryController");
const auth_1 = require("../../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/sheet', auth_1.authenticateToken, salaryController_1.salaryController.getSalarySheet);
exports.default = router;
