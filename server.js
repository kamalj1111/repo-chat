const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'frontend', 'dist');

// Build the frontend if dist doesn't exist
if (!fs.existsSync(DIST)) {
  console.log('[server] frontend/dist not found — building now...');
  try {
    execSync('npm install --prefix frontend', { stdio: 'inherit', cwd: __dirname });
    execSync('npm run build --prefix frontend', { stdio: 'inherit', cwd: __dirname });
    console.log('[server] Build complete.');
  } catch (err) {
    console.error('[server] Build failed:', err.message);
    process.exit(1);
  }
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`[server] ERROR: ${DIST}/index.html still missing after build. Exiting.`);
  process.exit(1);
}

console.log(`[server] Serving from: ${DIST}`);

app.use(express.static(DIST));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running on http://0.0.0.0:${PORT}`);
});
