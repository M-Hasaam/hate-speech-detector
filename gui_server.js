const http = require('http');
const fs = require('fs');
const path = require('path');
const { classifyText, loadClassifier, HF_MODEL_ID } = require('./model_engine');

const port = 3000;
const root = __dirname;

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function serveFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    send(res, 200, data, contentType);
  } catch (error) {
    send(res, 404, 'Not found');
  }
}

async function start() {
  console.log(`Loading local BERT model: ${HF_MODEL_ID}`);
  await loadClassifier();
  console.log('Model ready. Opening GUI at http://localhost:3000');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return serveFile(res, path.join(root, 'gui.html'), 'text/html; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/gui.js') {
      return serveFile(res, path.join(root, 'gui.js'), 'application/javascript; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/api/model') {
      return send(res, 200, JSON.stringify({ model: HF_MODEL_ID }), 'application/json; charset=utf-8');
    }

    if (req.method === 'POST' && url.pathname === '/api/predict') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const text = String(parsed.text || '').trim();
          if (!text) {
            return send(res, 400, JSON.stringify({ error: 'Text is required' }), 'application/json; charset=utf-8');
          }

          const result = await classifyText(text);
          return send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
        } catch (error) {
          return send(res, 500, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
        }
      });
      return;
    }

    return send(res, 404, 'Not found');
  });

  server.listen(port, () => {
    const open = require('child_process').exec;
    open(`start http://localhost:${port}`, { shell: true });
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
