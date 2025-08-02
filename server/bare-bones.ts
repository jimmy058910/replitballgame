import express from "express";

const app = express();
const port = process.env.PORT || 8080;

// Absolutely minimal setup
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Essential API endpoints (hardcoded responses only)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/teams/my', (req, res) => {
  res.json({ needsTeamCreation: true });
});

app.get('/api/season/current-cycle', (req, res) => {
  res.json({ currentDay: 1, seasonNumber: 1, phase: 'REGULAR_SEASON' });
});

app.get('/api/matches/live', (req, res) => {
  res.json([]);
});

app.get('/api/camaraderie/summary', (req, res) => {
  res.json({ teamCamaraderie: 50 });
});

app.get('/api/teams/my/next-opponent', (req, res) => {
  res.json({ error: 'No next opponent' });
});

app.get('/api/exhibitions/stats', (req, res) => {
  res.json({ totalExhibitions: 0, wins: 0, losses: 0 });
});

// Catch all for other API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Realm Rivalry</title>
  <meta charset="utf-8">
</head>
<body>
  <div id="root">Loading Realm Rivalry...</div>
  <script>console.log('Realm Rivalry server is running');</script>
</body>
</html>`);
});

// Start server immediately
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

export default app;