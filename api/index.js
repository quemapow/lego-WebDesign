// Vercel serverless function handler with serverless-http
import serverless from 'serverless-http';
import app from '../server/api.js';

// Wrap Express app for Vercel
export default serverless(app);
