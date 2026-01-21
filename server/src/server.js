import os from 'os';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/database.js';
// Import models to ensure associations are loaded
import './models/index.js';
// Import migration scripts
import runMigration from './scripts/migrateInventoryTables.js';
import runChatMigration from './scripts/migrateChatTables.js';
import runChatPatch from './scripts/patchChatTablesTimestamps.js';
import { authenticateSocket } from './utils/socketAuth.js';
import { initializeChatSocket } from './utils/chatSocket.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const getLanAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.values(interfaces).forEach((iface) => {
    iface?.forEach((details) => {
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    });
  });

  return addresses;
};

const logAccessibleUrls = () => {
  const lanAddresses = getLanAddresses();
  const urls = [
    { label: 'Localhost', url: `http://localhost:${PORT}/api/v1` },
    { label: 'Loopback', url: `http://127.0.0.1:${PORT}/api/v1` },
  ];

  lanAddresses.forEach((address, index) => {
    urls.push({ label: `LAN ${index + 1}`, url: `http://${address}:${PORT}/api/v1` });
  });

  urls.push({
    label: 'Android emulator (10.0.2.2)',
    url: `http://10.0.2.2:${PORT}/api/v1`,
  });

  console.log('🌐 Accessible API endpoints:');
  urls.forEach(({ label, url }) => console.log(`   • ${label}: ${url}`));

  if (!lanAddresses.length) {
    console.log(
      '   • LAN: Connect your machine to Wi‑Fi or Ethernet to expose a LAN address.'
    );
  }
};

/**
 * Run all startup tasks in sequence
 * This ensures database, migrations, and other setup tasks complete before starting the server
 */
const runStartupTasks = async () => {
  const tasks = [];
  
  // Task 1: Connect to database
  tasks.push({
    name: 'Database Connection',
    task: async () => {
      await connectDB();
    }
  });
  
  // Task 2: Run database migrations
  tasks.push({
    name: 'Database Migrations',
    task: async () => {
      console.log('🔄 Running database migrations...');
      try {
        const migrationResult = await runMigration(true); // silent = true
        if (migrationResult && migrationResult.success === false) {
          console.warn('⚠️  Inventory migration completed with warnings:', migrationResult.error);
        } else {
          console.log('✅ Inventory migrations completed');
        }
        
        // Run chat system migrations
        const chatMigrationResult = await runChatMigration(true); // silent = true
        if (chatMigrationResult && chatMigrationResult.success === false) {
          console.warn('⚠️  Chat migration completed with warnings:', chatMigrationResult.error);
        } else {
          console.log('✅ Chat system migrations completed');
        }

        // Run chat timestamps patch (idempotent)
        const chatPatchResult = await runChatPatch(true);
        if (chatPatchResult && chatPatchResult.success === false) {
          console.warn('⚠️  Chat patch completed with warnings:', chatPatchResult.error);
        } else {
          console.log('✅ Chat timestamps patch completed');
        }
      } catch (migrationError) {
        console.error('❌ Migration error:', migrationError.message);
        // Don't exit - allow server to start even if migration has issues
        // This is useful for development where some migrations might fail
        console.warn('⚠️  Continuing server startup despite migration warnings...');
      }
    },
    optional: true // Don't fail startup if migrations have issues
  });
  
  // Task 3: Verify email configuration (non-blocking)
  tasks.push({
    name: 'Email Service Verification',
    task: async () => {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const { verifyEmailConfig } = await import('./utils/emailService.js');
          const emailStatus = await verifyEmailConfig();
          if (emailStatus.configured) {
            console.log('✅ Email service configured and ready');
          } else {
            console.warn('⚠️  Email service configuration issue:', emailStatus.message);
          }
        } catch (emailError) {
          console.warn('⚠️  Could not verify email configuration:', emailError.message);
        }
      } else {
        console.log('ℹ️  Email service not configured (optional)');
      }
    },
    optional: true
  });
  
  // Execute all tasks in sequence
  for (const { name, task, optional } of tasks) {
    try {
      await task();
    } catch (error) {
      if (optional) {
        console.warn(`⚠️  ${name} failed (non-critical):`, error.message);
      } else {
        console.error(`❌ ${name} failed:`, error.message);
        throw error; // Re-throw critical errors
      }
    }
  }
};

// Connect to database and start server
const startServer = async () => {
  try {
    // Run all startup tasks (database connection, migrations, email verification, etc.)
    await runStartupTasks();
    
    // Create HTTP server from Express app
    const httpServer = createServer(app);
    
    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN 
          ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
          : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST']
      }
    });

    // Authenticate Socket.IO connections
    io.use(authenticateSocket);

    // Initialize chat socket handlers
    initializeChatSocket(io);

    console.log('✅ Socket.IO initialized');
    
    // Start the HTTP server
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (HOST === '0.0.0.0') {
        console.log('🔓 Host binding: 0.0.0.0 (accessible from LAN + emulator)');
      } else {
        console.log(`🔓 Host binding: ${HOST}`);
      }
      logAccessibleUrls();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});
