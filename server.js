// Local development server. On Netlify, netlify/functions/api.js runs the same app.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app, { ready } from './server/app.js';
import { dbLocation } from './server/db.js';
import * as coach from './server/coach.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

app.use(express.static(path.join(here, 'public'), { extensions: ['html'] }));

await ready();
app.listen(PORT, () => {
  console.log(`FluentStep running at http://localhost:${PORT}`);
  console.log(`Database: ${dbLocation}`);
  console.log(coach.aiEnabled() ? `AI coach: enabled (${coach.modelName()})` : 'AI coach: off (free mode). Set ANTHROPIC_API_KEY to enable AI feedback.');
});
