import app from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';

const server = app.listen(env.PORT, () => {
  console.log(`[RushRoute API] Listening on http://localhost:${env.PORT}/api/v1`);
  console.log(`[RushRoute API] Database Mode: ${db.getMode()}`);
  console.log(`[RushRoute API] Gemini AI Configured: ${env.isGeminiConfigured} (Model: ${env.GEMINI_MODEL})`);
});

export default server;
