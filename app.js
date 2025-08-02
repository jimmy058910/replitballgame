import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Critical: Use Cloud Run's PORT environment variable
const port = process.env.PORT || 8080;

// Industry standard: Parse JSON and serve static files
app.use(express.json());
app.use(express.static('dist'));

// Health check endpoint (Cloud Run requirement)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: 'industry-standard'
  });
});

// Basic API endpoints
app.get('/api/teams/my', (req, res) => {
  res.json({ needsTeamCreation: true });
});

app.get('/api/health', (req, res) => {
  res.json({ api: 'healthy' });
});

// SPA fallback for frontend routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Serve frontend or fallback
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Realm Rivalry API Server', status: 'ready' });
  }
});

// Industry standard: Listen on 0.0.0.0 for Cloud Run
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});