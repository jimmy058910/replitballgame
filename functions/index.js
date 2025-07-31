const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Import your existing Express app
const app = express();
app.use(cors());

// Import all your existing routes
// TODO: Import your auth routes, team routes, etc.

// Export as Firebase Function
exports.api = functions.https.onRequest(app);