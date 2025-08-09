// DEPLOY #97: NUCLEAR OPTION - Ultra-simple server for Cloud Run debugging
const http = require('http');

console.log('🔥 === MINIMAL SERVER STARTING ===');
console.log('🔥 Node.js version:', process.version);
console.log('🔥 Platform:', process.platform);
console.log('🔥 Working directory:', process.cwd());

// Log ALL environment variables to debug Cloud Run
console.log('🔥 ALL ENVIRONMENT VARIABLES:');
Object.keys(process.env).sort().forEach(key => {
  if (key.includes('PORT') || key.includes('K_') || key.includes('GOOGLE') || key.includes('NODE')) {
    const value = process.env[key];
    console.log(`   ${key}: ${value || 'undefined'}`);
  }
});

// Force port to 8080 for Cloud Run (Cloud Run ALWAYS expects 8080)
const port = parseInt(process.env.PORT) || 8080;
const host = '0.0.0.0';

console.log(`🔥 BINDING TO: ${host}:${port}`);
console.log(`🔥 PORT source: ${process.env.PORT ? 'ENV Variable' : 'Default 8080'}`);

const server = http.createServer((req, res) => {
  console.log(`🔥 REQUEST: ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  
  // Simple health check responses
  if (req.url === '/health' || req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`NUCLEAR SERVER WORKING!\nDeploy #97\nTime: ${new Date().toISOString()}\nPort: ${port}\n`);
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minimal server is alive!\n');
});

// Add comprehensive error handling
server.on('error', (error) => {
  console.error('🔥 FATAL SERVER ERROR:', error.message);
  console.error('🔥 Error code:', error.code);  
  console.error('🔥 Error syscall:', error.syscall);
  console.error('🔥 Error address:', error.address);
  console.error('🔥 Error port:', error.port);
  console.error('🔥 Full error:', error);
  process.exit(1);
});

console.log('🔥 About to call server.listen()...');

server.listen(port, host, () => {
  console.log('🔥 ========================================');
  console.log(`🔥 SUCCESS! Server listening on ${host}:${port}`);
  console.log('🔥 Server is ready for Cloud Run health checks');
  console.log('🔥 ========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔥 SIGTERM received - graceful shutdown');
  server.close(() => {
    console.log('🔥 Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔥 SIGINT received - graceful shutdown');  
  server.close(() => {
    console.log('🔥 Server closed gracefully');
    process.exit(0);
  });
});

console.log('🔥 Minimal server setup complete - waiting for listen callback...');