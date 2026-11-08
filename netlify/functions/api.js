// Runs the Express API as a Netlify Function.
import serverless from 'serverless-http';
import app, { ready } from '../../server/app.js';

const run = serverless(app);

export const handler = async (event, context) => {
  await ready;
  return run(event, context);
};
