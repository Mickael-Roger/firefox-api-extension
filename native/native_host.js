#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

const http = require('http');
const url = require('url');

const HOST = '127.0.0.1';
const PORT = 8090;

let server = null;
let nextRequestId = 1;
const pendingRequests = new Map();

function sendNativeMessage(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  console.error('Sending message type:', message.type, 'length:', buffer.length);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

let inputBuffer = Buffer.alloc(0);

function readNativeMessage() {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);
  }
  
  while (inputBuffer.length >= 4) {
    const length = inputBuffer.readUInt32LE(0);
    
    if (inputBuffer.length < 4 + length) {
      // Don't have full message yet
      break;
    }
    
    const messageData = inputBuffer.slice(4, 4 + length);
    inputBuffer = inputBuffer.slice(4 + length);
    
    try {
      const message = JSON.parse(messageData.toString('utf8'));
      console.error('Parsed message type:', message.type);
      handleExtensionMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
}

process.stdin.on('readable', readNativeMessage);

function handleExtensionMessage(message) {
  console.error('Received message type:', message.type);
  
  // Ignore config messages (none expected in simplified version)
  if (message.type) {
    console.error('Ignoring message type:', message.type);
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

function createServer() {
  return http.createServer((req, res) => {
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
  
  server.listen(PORT, HOST, () => {
    console.error(`Native host HTTP server listening on ${HOST}:${PORT}`);
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

// Initial server start
startServer();

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
  stopServer(() => {
    process.exit(0);
  });
});