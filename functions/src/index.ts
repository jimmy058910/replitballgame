import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import * as cors from "cors";

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Placeholder for your existing API routes
app.get("/api/teams/my", (req, res) => {
  // This would integrate with your existing backend logic
  res.json({ message: "Teams API - integrate with your existing backend" });
});

app.get("/api/auth/user", (req, res) => {
  // This would integrate with Firebase Auth
  res.json({ message: "Auth API - integrate with Firebase Auth" });
});

// Export the API
export const api = onRequest(app);