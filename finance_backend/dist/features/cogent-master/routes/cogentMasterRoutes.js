"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cogentMasterController_1 = require("../controllers/cogentMasterController");
const router = express_1.default.Router();
router.get('/', cogentMasterController_1.cogentMasterController.getMasterData);
router.post('/save', cogentMasterController_1.cogentMasterController.saveMasterData);
exports.default = router;
