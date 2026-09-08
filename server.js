const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'frontend', 'dist');

// Fail fast with a clear message if dist doesn't exist
if (!fs.existsSync(DIST)) {
  console.error(`ERROR: Build output not found at ${DIST}`);
  console.error('Run "npm run build" first.');
  process.exit(1);
}

console.log(`Serving files from: ${DIST}`);

// Serve static files from the built frontend
app.use(express.static(DIST));

// SPA fallback — all unknown routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on http://0.0.0.0:${PORT}`);
});
