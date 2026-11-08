// Runs the Express API as a Netlify Function.
import serverless from 'serverless-http';
import app from '../../server/app.js';

export const handler = serverless(app);
