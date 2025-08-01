import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupGoogleAuth } from './googleAuth';
import logger from './utils/logger';

// Import the centralized route registration
import { registerAllRoutes } from './routes/index';

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
    'https://www.realmrivalry.com',  // Include www version
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

// Session configuration for Cloud Run
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-session-secret-for-cloud-run',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-backend',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Initialize Google Auth (Passport)
const initializeAuth = async () => {
  try {
    logger.info('Setting up Google OAuth with Passport...');
    await setupGoogleAuth();
    logger.info('Google OAuth initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google OAuth:', error);
    // Continue without auth for basic API functionality
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
    
    // Use centralized route registration
    registerAllRoutes(app);
    
    logger.info('All API routes registered successfully');
  } catch (error) {
    logger.error('Failed to register routes:', error);
    // Add basic fallback routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'API routes failed to load', error: error.message });
    });
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