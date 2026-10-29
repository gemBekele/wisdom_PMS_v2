import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDB, prisma } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generateNplSnapshot } from './utils/performanceCalculator.js';
import { recalculateScoresForPeriod } from './utils/scoreRecalculator.js';
import { getActivePeriod } from './utils/periodUtils.js';

// Load env vars
dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be set to a random value of at least 32 characters');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// CORS - Allow all origins in development, specific origin in production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import planRoutes from './routes/planRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import mappingRoutes from './routes/mappingRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import behavioralRoutes from './routes/behavioralRoutes.js';
import cbsRoutes from './routes/cbsRoutes.js';
import cbsReportRoutes from './routes/cbsReportRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import juneBalanceRoutes from './routes/juneBalanceRoutes.js';
import productKpiMappingRoutes from './routes/productKpiMappingRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import regionRoutes from './routes/regionRoutes.js';
import staffPlanRoutes from './routes/staffPlanRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import mappedAccountsRoutes from './routes/mappedAccountsRoutes.js';
import configRoutes from './routes/configRoutes.js';
import kpiFrameworkConfigRoutes from './routes/kpiFrameworkConfigRoutes.js';
import nplRoutes from './routes/nplRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/behavioral', behavioralRoutes);
app.use('/api/cbs', cbsRoutes);
app.use('/api/cbs', cbsReportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/june-balance', juneBalanceRoutes);
app.use('/api/product-mappings', productKpiMappingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/staff-plans', staffPlanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/mapped-accounts', mappedAccountsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/kpi-config', kpiFrameworkConfigRoutes);
app.use('/api/npl', nplRoutes);
app.use('/api', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wisdom SACCOS PMS API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server after database connection
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Schedule daily NPL snapshot at 02:00
    cron.schedule('0 2 * * *', async () => {
      console.log('[CRON] Running daily NPL snapshot...');
      try {
        const branches = await prisma.branch.findMany();
        for (const branch of branches) {
          await generateNplSnapshot(branch.id);
          console.log(`[CRON] NPL snapshot created for branch ${branch.code}`);
        }
        console.log('[CRON] Daily NPL snapshot complete');
      } catch (err) {
        console.error('[CRON] NPL snapshot failed:', err.message);
      }
    });
    
    // Start server only after DB connection succeeds
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 API available at http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
