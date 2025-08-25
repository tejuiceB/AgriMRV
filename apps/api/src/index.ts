import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';
import plotRoutes from './routes/plotRoutes';
import treeRoutes from './routes/treeRoutes';
import carbonRoutes from './routes/carbonRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import mrvRoutes from './routes/mrv';
import exportsRoutes from './routes/exports';
import setupRoutes from './routes/setupRoutes';
import uploadRoutes from './routes/uploadRoutes';
import estimationRoutes from './routes/estimationRoutes';
import carbonCreditRoutes from './routes/carbonCreditRoutes';
import blockchainRoutes from './routes/blockchain';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simple request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/trees', treeRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api', mrvRoutes); // MRV routes
app.use('/api', exportsRoutes); // Registry export routes
app.use('/api/setup', setupRoutes); // Database setup and test user creation
app.use('/api/upload', uploadRoutes); // File upload routes
app.use('/api/estimate', estimationRoutes); // Biomass estimation routes
app.use('/api/carbon-credits', carbonCreditRoutes); // Carbon credit calculation routes
app.use('/api/blockchain', blockchainRoutes); // Blockchain carbon ledger routes
app.use('/api', setupRoutes); // Setup routes

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
