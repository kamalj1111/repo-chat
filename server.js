const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DIST = path.join(ROOT, 'frontend', 'dist');
const INDEX = path.join(DIST, 'index.html');

function runCmd(cmd) {
  console.log(`[build] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

if (!fs.existsSync(INDEX)) {
  console.log('[build] frontend/dist/index.html not found — building...');
  try {
    // CORRECT npm --prefix syntax: flag goes BEFORE the subcommand
    runCmd('npm --prefix frontend install');
    runCmd('npm --prefix frontend run build');
  } catch (err) {
    console.error('[build] FAILED:', err.message);
    process.exit(1);
  }
  if (!fs.existsSync(INDEX)) {
    console.error('[build] index.html still missing after build — aborting.');
    process.exit(1);
  }
}

console.log('[server] Serving:', DIST);
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(INDEX));
app.listen(PORT, '0.0.0.0', () =>
  console.log(`[server] http://0.0.0.0:${PORT}`)
);
