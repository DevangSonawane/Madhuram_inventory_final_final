import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import leadRoutes from './leadRoutes.js';
import roleRoutes from './roleRoutes.js';
import moduleRoutes from './moduleRoutes.js';
import travelTrackerRoutes from './travelTrackerRoute.js';
import inventoryRoutes from './inventoryRoutes.js';
import adminRoutes from './adminRoutes.js';
import chatRoutes from './chatRoutes.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { getMetricsSnapshot } from '../middleware/metrics.js';
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use(rateLimit({ windowMs: 60_000, max: 300 }));
router.use(requestLogger('api'));

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/role', roleRoutes);
router.use('/module', moduleRoutes);
router.use('/users', userRoutes);
router.use('/travelTracker', travelTrackerRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

// Metrics endpoint (in-process metrics, not suitable for multi-instance without shared store)
router.get('/metrics', (req, res) => {
  res.status(200).json({
    success: true,
    data: getMetricsSnapshot()
  });
});

export default router;