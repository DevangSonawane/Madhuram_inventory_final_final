import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import sequelize from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import poRoutes from './routes/poRoutes.js';
import dcRoutes from './routes/dcRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import boqRoutes from './routes/boqRoutes.js';
import mirRoutes from './routes/mirRoutes.js';
import itrRoutes from './routes/itrRoutes.js';
import sampleRoutes from './routes/sampleRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import vendorPriceListRoutes from './routes/vendorPriceListRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
// Base URL in doc is https://api.festmate.in
// Endpoints are /api/auth/...
app.use('/api/auth', authRoutes);
app.use('/api/po', poRoutes);
app.use('/api/dc', dcRoutes);
app.use('/api', projectRoutes);
app.use('/api/boq', boqRoutes);
app.use('/api/mir', mirRoutes);
app.use('/api/itr', itrRoutes);
app.use('/api/sample', sampleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor-price-list', vendorPriceListRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Database Sync and Server Start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');
    
    // Sync models (alter: true updates schema if needed, force: false preserves data)
    // Using alter to ensure new columns like project_list and username are added
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server start error:', error);
  }
};

startServer();
