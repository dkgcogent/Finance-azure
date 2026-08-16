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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
