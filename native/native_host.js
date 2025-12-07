#!/usr/bin/env node

const http = require('http');
const url = require('url');

const HOST = '127.0.0.1';

let config = {
  port: 8090,
  apiToken: ''
};

let server = null;
let nextRequestId = 1;
const pendingRequests = new Map();

function sendNativeMessage(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

function readNativeMessage() {
  const header = process.stdin.read(4);
  if (header === null) return;
  const length = header.readUInt32LE(0);
  const data = process.stdin.read(length);
  if (data === null) return;
  const message = JSON.parse(data);
  handleExtensionMessage(message);
}

process.stdin.on('readable', readNativeMessage);

function handleExtensionMessage(message) {
  if (message.type === 'config') {
    handleConfigUpdate(message.config);
    return;
  }
  
  const { requestId, response, error } = message;
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    console.error('Received response for unknown request ID:', requestId);
    return;
  }
  pendingRequests.delete(requestId);
  const { res } = pending;
  if (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error: ' + error);
  } else {
    res.writeHead(response.status, { 'Content-Type': response.contentType });
    res.end(response.body);
  }
}

function handleConfigUpdate(newConfig) {
  console.error('Received config update:', newConfig);
  
  const portChanged = newConfig.port !== config.port;
  config = { ...config, ...newConfig };
  
  if (portChanged) {
    console.error(`Port changed from ${config.port} to ${newConfig.port}, restarting server...`);
    restartServer();
  } else {
    console.error('Config updated (no port change)');
  }
}

function createServer() {
  return http.createServer((req, res) => {
    // Validate API token if configured
    if (config.apiToken && config.apiToken.trim() !== '') {
      const token = req.headers['x-api-token'] || req.headers['authorization'];
      const expected = `Bearer ${config.apiToken}`;
      
      if (!token || token !== expected) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized: Invalid or missing API token');
        return;
      }
    }
    
    const parsedUrl = url.parse(req.url, true);
    const requestId = nextRequestId++;
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const requestData = {
        requestId,
        method: req.method,
        path: parsedUrl.pathname,
        query: parsedUrl.query,
        headers: req.headers,
        body: body
      };
      
      pendingRequests.set(requestId, { res });
      sendNativeMessage(requestData);
    });
  });
}

function startServer() {
  if (server) {
    console.error('Server already running');
    return;
  }
  
  server = createServer();
  
  server.listen(config.port, HOST, () => {
    console.error(`Native host HTTP server listening on ${HOST}:${config.port}`);
    if (config.apiToken && config.apiToken.trim() !== '') {
      console.error('API token authentication is enabled');
    }
  });
  
  server.on('error', (err) => {
    console.error('HTTP server error:', err);
  });
}

function stopServer(callback) {
  if (!server) {
    if (callback) callback();
    return;
  }
  
  server.close((err) => {
    if (err) {
      console.error('Error stopping server:', err);
    } else {
      console.error('Server stopped');
    }
    server = null;
    if (callback) callback();
  });
}

function restartServer() {
  stopServer(startServer);
}

// Initial server start
startServer();

process.on('SIGINT', () => {
  stopServer(() => {
    process.exit(0);
  });
});