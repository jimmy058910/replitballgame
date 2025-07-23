import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

console.log('🚀 Starting Realm Rivalry Production Server v2');
console.log('📍 Port:', PORT);
console.log('📁 Working Directory:', process.cwd());

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    version: '2.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    api: 'ready'
  });
});

// Enhanced static file serving function
async function initializeStaticFileServing(app: express.Application) {
  console.log('🔍 === STATIC FILE SERVING INITIALIZATION ===');
  console.log('📁 Current working directory:', process.cwd());
  
  try {
    const rootFiles = fs.readdirSync('.').slice(0, 15);
    console.log('📁 Root directory contents:', rootFiles);
  } catch (e) {
    console.log('❌ Cannot read root directory:', e);
  }
  
  // Check for dist folder and contents
  const distPath = path.resolve('dist');
  const indexPath = path.resolve('dist', 'index.html');
  
  console.log('🔍 Checking dist path:', distPath);
  console.log('🔍 Checking index path:', indexPath);
  
  if (fs.existsSync(distPath)) {
    console.log('✅ Dist folder exists');
    try {
      const distContents = fs.readdirSync(distPath);
      console.log('📁 Dist contents:', distContents.slice(0, 10));
      
      if (fs.existsSync(indexPath)) {
        console.log('✅ index.html found');
        const indexStats = fs.statSync(indexPath);
        console.log('📄 index.html size:', indexStats.size, 'bytes');
        
        // Read first 500 chars to verify content
        const indexContent = fs.readFileSync(indexPath, 'utf8').substring(0, 500);
        console.log('📄 Index.html preview:', indexContent.substring(0, 200) + '...');
        
        if (indexContent.includes('Realm Rivalry') || indexContent.includes('root') || indexContent.includes('<!DOCTYPE html>')) {
          console.log('✅ index.html appears valid - setting up static serving');
          
          // Set up static file serving with optimized settings
          app.use(express.static(distPath, {
            maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
              if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'public, max-age=3600');
              } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
                res.setHeader('Cache-Control', 'public, max-age=31536000');
              }
            }
          }));
          
          // SPA fallback for client-side routing
          app.get('*', (req, res, next) => {
            // Skip API routes and health checks
            if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/health') {
              return next();
            }
            
            // Serve index.html for all other routes
            console.log('📄 Serving SPA fallback for:', req.path);
            res.sendFile(indexPath, (err) => {
              if (err) {
                console.error('❌ Error serving index.html:', err);
                res.status(500).send('Internal server error serving React app');
              }
            });
          });
          
          console.log('✅ Static file serving initialized successfully');
          return true;
        } else {
          console.log('❌ index.html content appears invalid');
          return false;
        }
      } else {
        console.log('❌ index.html not found in dist folder');
        return false;
      }
    } catch (e) {
      console.log('❌ Error reading dist folder:', e);
      return false;
    }
  } else {
    console.log('❌ Dist folder does not exist');
    return false;
  }
  
  // This should never be reached due to explicit returns above, but TypeScript requires it
  // Fallback: serve loading page  
  console.log('⚠️ Setting up fallback loading page');
  setupFallbackRoutes(app);
  return false;
}

function setupFallbackRoutes(app: express.Application) {
  // Enhanced fallback with system diagnostics
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Diagnostic information for debugging
    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestPath: req.path,
      workingDirectory: process.cwd(),
      distExists: fs.existsSync('dist'),
      indexExists: fs.existsSync('dist/index.html'),
      availableFiles: (() => {
        try {
          return fs.readdirSync('.').slice(0, 10);
        } catch {
          return ['Unable to read directory'];
        }
      })()
    };
    
    console.log('📊 Serving fallback page with diagnostics:', JSON.stringify(diagnostics, null, 2));
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Realm Rivalry - System Initializing</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container { max-width: 600px; padding: 2rem; }
            .logo { font-size: 3rem; margin-bottom: 1rem; }
            .spinner { 
              border: 4px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top: 4px solid #fff;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 2rem auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .status { margin: 1rem 0; opacity: 0.9; }
            .debug { 
              background: rgba(0,0,0,0.3); 
              padding: 1rem; 
              border-radius: 8px; 
              margin-top: 2rem;
              font-family: monospace;
              font-size: 0.8rem;
              text-align: left;
            }
            .retry { margin-top: 2rem; }
            button {
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🏟️ Realm Rivalry</div>
            <div class="spinner"></div>
            <h2>Fantasy Sports Platform Initializing...</h2>
            <div class="status">
              Deployment in progress. The React application is being built and deployed.<br>
              This page will automatically redirect once the system is ready.<br>
              <strong>Expected resolution time: 2-5 minutes</strong>
            </div>
            <div class="retry">
              <button onclick="window.location.reload()">Check Again</button>
              <button onclick="window.open('/api/health', '_blank')">Check API Status</button>
            </div>
            <div class="debug">
              <strong>System Diagnostics:</strong><br>
              Timestamp: ${diagnostics.timestamp}<br>
              Request Path: ${diagnostics.requestPath}<br>
              Dist Folder: ${diagnostics.distExists ? '✅ Exists' : '❌ Missing'}<br>
              Index File: ${diagnostics.indexExists ? '✅ Found' : '❌ Missing'}<br>
              Working Dir: ${diagnostics.workingDirectory}<br>
              Available Files: ${diagnostics.availableFiles.join(', ')}<br>
            </div>
          </div>
          <script>
            // Auto-refresh every 30 seconds
            setTimeout(function() {
              console.log('Auto-refreshing page to check for updates...');
              window.location.reload();
            }, 30000);
            
            // Check API status every 10 seconds
            setInterval(function() {
              fetch('/api/health')
                .then(function(response) {
                  if (response.ok) {
                    console.log('API is responding - checking for React app...');
                  }
                })
                .catch(function(e) {
                  console.log('API check failed:', e);
                });
            }, 10000);
          </script>
        </body>
      </html>
    `);
  });
}

// Create HTTP server
const server = createServer(app);

// Start server immediately for fast Cloud Run startup
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log('🎉 Server ready - initializing background services...');
  
  // Initialize everything else AFTER server is listening
  setTimeout(async () => {
    try {
      console.log('🔄 Starting background initialization...');
      
      // First, try to set up static file serving
      const staticServed = await initializeStaticFileServing(app);
      
      if (!staticServed) {
        console.log('⚠️ React app not available - serving fallback loading page');
      }
      
      // Dynamic imports to avoid blocking startup
      try {
        const { setupGoogleAuth } = await import('./googleAuth');
        const { registerAllRoutes } = await import('./routes/index');
        const session = await import('express-session');
        const passport = await import('passport');
        
        // Session configuration
        app.use(session.default({
          secret: process.env.SESSION_SECRET || 'default-secret-key',
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const
          }
        }));
        
        app.use(passport.default.initialize());
        app.use(passport.default.session());
        
        // Initialize auth
        await setupGoogleAuth(app);
        console.log('✅ Authentication initialized');
        
        // Register routes
        registerAllRoutes(app);
        console.log('✅ API routes initialized');
        
        console.log('🎉 Background initialization complete');
        
      } catch (error) {
        console.error('❌ Background initialization failed:', error);
        console.log('⚠️ Server will continue with basic functionality');
      }
      
    } catch (error) {
      console.error('❌ Critical initialization error:', error);
    }
  }, 1000); // 1 second delay to ensure server is fully ready
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('📴 Server closed');
    process.exit(0);
  });
});

export default app;