import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import sequelize from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import poRoutes from './routes/poRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
// Base URL in doc is https://api.festmate.in
// Endpoints are /api/auth/...
app.use('/api/auth', authRoutes);
app.use('/api/po', poRoutes);

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
