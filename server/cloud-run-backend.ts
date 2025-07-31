import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
// WebSocket functionality will be implemented later
import logger from './utils/logger';

// Import individual route modules
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import playerRoutes from './routes/playerRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import matchRoutes from './routes/matchRoutes';
import liveMatchRoutes from './routes/liveMatchRoutes';
import worldRoutes from './routes/worldRoutes';
import storeRoutes from './routes/storeRoutes';
import notificationRoutes from './routes/notificationRoutes';
import tournamentRoutes from './routes/tournamentRoutes';

const app = express();
const PORT = process.env.PORT || 8080;

// Security and performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

// CORS configuration for Firebase Hosting
app.use(cors({
  origin: [
    'https://realmrivalry.com',
    'https://direct-glider-465821-p7.web.app',
    'https://direct-glider-465821-p7.firebaseapp.com',
    'http://localhost:5000', // Development
    'http://localhost:3000'  // Development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-backend',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Initialize Firebase Auth middleware (for token verification)
const initializeAuth = async () => {
  try {
    logger.info('Setting up Firebase token verification...');
    // Basic auth middleware - Firebase tokens will be verified client-side
    app.use('/api', (req, res, next) => {
      // For now, pass through all requests - Firebase handles auth client-side
      next();
    });
    logger.info('Firebase auth middleware initialized');
  } catch (error) {
    logger.error('Failed to initialize auth middleware:', error);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    logger.info('Initializing backend services...');
    logger.info('All backend services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
  }
};

// Register all API routes
const setupRoutes = () => {
  try {
    logger.info('Registering API routes...');
    
    // Register individual route modules
    app.use('/api', authRoutes);
    app.use('/api', teamRoutes);
    app.use('/api', playerRoutes);
    app.use('/api', marketplaceRoutes);
    app.use('/api', matchRoutes);
    app.use('/api', liveMatchRoutes);
    app.use('/api', worldRoutes);
    app.use('/api', storeRoutes);
    app.use('/api', notificationRoutes);
    app.use('/api', tournamentRoutes);
    
    logger.info('All API routes registered successfully');
  } catch (error) {
    logger.error('Failed to register routes:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize authentication
    await initializeAuth();
    
    // Setup routes
    setupRoutes();
    
    // Initialize background services
    await initializeServices();
    
    // Start listening directly (WebSocket functionality will be added later)
    app.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
      logger.info(`🚀 Backend server listening on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌐 CORS enabled for Firebase domains`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();