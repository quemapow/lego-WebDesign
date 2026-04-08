// Vercel serverless function handler
import app from '../server/api.js';

export default function handler(req, res) {
  // Handle as Express middleware
  return app(req, res);
}
