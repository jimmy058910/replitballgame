import express from 'express';
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/health', (req, res) => {
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

app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.send('<html><body><h1>Realm Rivalry</h1><div id="root">Server Running</div></body></html>');
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});