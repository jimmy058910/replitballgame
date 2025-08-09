// DEPLOY #99: Proven minimal Cloud Run server pattern
const http = require('http');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Cloud Run!\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});