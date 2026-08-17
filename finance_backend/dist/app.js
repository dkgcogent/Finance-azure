"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./features/auth/routes/authRoutes"));
const budgetRoutes_1 = __importDefault(require("./features/budgeting/routes/budgetRoutes"));
const actualRoutes_1 = __importDefault(require("./features/actuals/routes/actualRoutes"));
const invoicing_1 = require("./features/invoicing");
const vendorRoutes_1 = __importDefault(require("./features/vendor-invoicing/routes/vendorRoutes"));
const imprestRoutes_1 = __importDefault(require("./features/payables/routes/imprestRoutes"));
const salaryRoutes_1 = __importDefault(require("./features/payables/routes/salaryRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
    if (typeof req.body === 'string') {
        try {
            req.body = JSON.parse(req.body);
        }
        catch (e) { }
    }
    next();
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/budget', budgetRoutes_1.default);
app.use('/api/actuals', actualRoutes_1.default);
app.use('/api/invoicing', invoicing_1.invoiceRoutes);
app.use('/api/vendors', vendorRoutes_1.default);
app.use('/api/imprests', imprestRoutes_1.default);
app.use('/api/salaries', salaryRoutes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Finance Budgeting API is healthy' });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = typeof err.message === 'string' ? err.message : (err?.error || 'Internal Server Error');
    res.status(status).json({ message });
});
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
exports.default = app;
