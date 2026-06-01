const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3000;

// Disable caching for all responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Proxy API requests to backend
const proxyToBackend = (backendPath) => (req, res) => {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: backendPath + req.url,
    method: req.method,
    headers: req.headers
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.status(502).json({ error: 'Backend unavailable' });
  });
  req.pipe(proxyReq);
};

// Proxy paths
app.use('/_/backend/api', proxyToBackend('/api'));
app.use('/_/backend/uploads', proxyToBackend('/uploads'));
app.use('/api', proxyToBackend('/api'));
app.use('/uploads', proxyToBackend('/uploads'));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
