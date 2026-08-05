import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './features/auth/routes/authRoutes';
import budgetRoutes from './features/budgeting/routes/budgetRoutes';
import actualRoutes from './features/actuals/routes/actualRoutes';
import { invoiceRoutes } from './features/invoicing';
import vendorRoutes from './features/vendor-invoicing/routes/vendorRoutes';
import imprestRoutes from './features/payables/routes/imprestRoutes';
import salaryRoutes from './features/payables/routes/salaryRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/actuals', actualRoutes);
app.use('/api/invoicing', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/imprests', imprestRoutes);
app.use('/api/salaries', salaryRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Finance Budgeting API is healthy' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
