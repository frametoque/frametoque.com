/**
 * Portable Node.js Startup File for Shared Hosting (cPanel / Passenger / PM2)
 * Automatically delegates to Next.js standalone server if present,
 * or boots standard Next.js server otherwise.
 */
const path = require('path');
const fs = require('fs');

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServer)) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  process.env.PORT = process.env.PORT || '3000';
  require(standaloneServer);
} else {
  const next = require('next');
  const http = require('http');
  const port = parseInt(process.env.PORT || '3000', 10);
  const dev = process.env.NODE_ENV !== 'production';
  const app = next({ dev, dir: __dirname });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    http.createServer((req, res) => handle(req, res)).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on port ${port} (standard mode)`);
    });
  });
}
