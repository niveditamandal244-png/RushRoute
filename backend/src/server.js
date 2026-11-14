import app from './app.js';
import { env, envFileInfo } from './config/env.js';
import { db } from './config/database.js';

const server = app.listen(env.PORT, () => {
  console.log(`[RushRoute API] Listening on http://localhost:${env.PORT}/api/v1`);
  console.log(
    `[RushRoute API] Env file: ${envFileInfo.path} (${envFileInfo.loaded ? 'loaded' : `NOT loaded: ${envFileInfo.error}`})`
  );
  console.log(`[RushRoute API] Database Mode: ${db.getMode()}`);
  console.log(`[RushRoute API] Gemini AI Configured: ${env.isGeminiConfigured} (Model: ${env.GEMINI_MODEL})`);
  if (env.missingConfig.length > 0) {
    console.warn(`[RushRoute API] Missing or invalid config: ${env.missingConfig.join(', ')}`);
  }
});

// A second server started while an older one still holds the port would otherwise
// crash with a raw stack trace, leaving the stale server running unnoticed.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[RushRoute API] Port ${env.PORT} is already in use. An older RushRoute backend is probably still running ` +
        `with outdated configuration. Stop that process, then start this server again.`
    );
    process.exit(1);
  }
  throw err;
});

export default server;
