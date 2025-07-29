const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Simple health check
app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Test server is working!', port });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
});
