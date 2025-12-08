// SPDX-License-Identifier: Apache-2.0
const HOST_NAME = 'firefox_api_extension';
let port = null;
let config = {
  port: 8090,
  apiToken: ''
};
let configRequestCallbacks = new Map();
let nextConfigRequestId = 1;

function sendConfigRequest(type, configData) {
  return new Promise((resolve, reject) => {
    if (!port) {
      reject(new Error('Native host not connected'));
      return;
    }
    
    const requestId = nextConfigRequestId++;
    configRequestCallbacks.set(requestId, { resolve, reject });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (configRequestCallbacks.has(requestId)) {
        configRequestCallbacks.delete(requestId);
        reject(new Error('Config request timeout'));
      }
    }, 5000);
    
    const message = { type, requestId };
    if (configData) {
      message.config = configData;
    }
    
    port.postMessage(message);
  });
}

function handleConfigResponse(message) {
  const { requestId, success, config: newConfig } = message;
  const callback = configRequestCallbacks.get(requestId);
  
  if (callback) {
    configRequestCallbacks.delete(requestId);
    if (success) {
      // Update global config
      config = { ...config, ...newConfig };
      callback.resolve(newConfig);
    } else {
      callback.reject(new Error('Config operation failed'));
    }
  } else {
    console.error('Received config response for unknown request ID:', requestId);
  }
}

async function loadConfig() {
  // Try to get config from native host first
  if (port) {
    try {
      const newConfig = await sendConfigRequest('getConfig');
      config = { ...config, ...newConfig };
      console.log('Loaded config from native host:', config);
      return;
    } catch (error) {
      console.error('Failed to load config from native host, falling back to storage:', error);
    }
  }
  
  // Fallback to storage.local
  try {
    const stored = await browser.storage.local.get(['port', 'apiToken']);
    if (stored.port !== undefined) {
      config.port = stored.port;
    }
    if (stored.apiToken !== undefined) {
      config.apiToken = stored.apiToken;
    }
    console.log('Loaded config from storage:', config);
  } catch (error) {
    console.error('Failed to load config from storage:', error);
  }
}

async function sendConfigToNativeHost() {
  if (!port) {
    console.error('No native host connection to send config');
    return;
  }
  
  // Try new setConfig message first
  try {
    await sendConfigRequest('setConfig', config);
    console.log('Config sent to native host via setConfig');
  } catch (error) {
    console.error('Failed to send config via setConfig, falling back to old message:', error);
    // Fallback to old config message for backward compatibility
    port.postMessage({
      type: 'config',
      config: config
    });
  }
}

async function connectToNativeHost() {
  console.log('Attempting to connect to native host...');
  try {
    port = browser.runtime.connectNative(HOST_NAME);
    console.log('Connected to native host');
    
    port.onMessage.addListener(handleNativeMessage);
    port.onDisconnect.addListener(() => {
      console.error('Disconnected from native host');
      port = null;
      setTimeout(connectToNativeHost, 1000);
    });
    
    // Load configuration (will try native host first, then storage)
    await loadConfig();
    
    // Send configuration to native host (migration from storage to file)
    setTimeout(sendConfigToNativeHost, 100);
  } catch (error) {
    console.error('Failed to connect to native host:', error);
    setTimeout(connectToNativeHost, 1000);
  }
}

function handleNativeMessage(message) {
  if (message.type === 'configResponse') {
    handleConfigResponse(message);
    return;
  }
  
  const { requestId, method, path, query, headers, body } = message;
  console.log(`Received request ${requestId}: ${method} ${path}, body length: ${body ? body.length : 0}`);
  
  routeRequest(requestId, method, path, body);
}

async function routeRequest(requestId, method, path, body) {
  console.log(`Routing ${method} ${path}`);
  
  let response;
  try {
    if (method === 'GET' && path === '/windows') {
      response = await handleGetWindows();
    } else if (method === 'GET' && path === '/tabs') {
      response = await handleGetTabs();
    } else if (method === 'POST' && path === '/switch-tab') {
      response = await handleSwitchTab(body);
    } else if (method === 'POST' && path === '/open-url') {
      response = await handleOpenUrl(body);
    } else if (method === 'POST' && path === '/close-tab') {
      response = await handleCloseTab(body);
    } else {
      response = { status: 404, contentType: 'text/plain', body: 'Endpoint not found' };
    }
  } catch (error) {
    console.error('Error handling request:', error);
    response = { status: 500, contentType: 'text/plain', body: error.message };
  }
  
  console.log(`Sending response for ${requestId}: status ${response.status}`);
  sendNativeResponse(requestId, response);
}

async function handleGetWindows() {
  const windows = await browser.windows.getAll({ populate: true });
  const data = windows.map(win => ({
    id: win.id,
    focused: win.focused,
    type: win.type,
    tabs: win.tabs ? win.tabs.map(tab => ({
      id: tab.id,
      index: tab.index,
      title: tab.title,
      url: tab.url,
      active: tab.active
    })) : []
  }));
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) };
}

async function handleGetTabs() {
  const tabs = await browser.tabs.query({});
  const data = tabs.map(tab => ({
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title,
    url: tab.url,
    active: tab.active
  }));
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) };
}

async function handleSwitchTab(body) {
  const params = JSON.parse(body);
  const tabId = params.tabId;
  if (typeof tabId !== 'number') {
    return { status: 400, contentType: 'text/plain', body: 'Missing or invalid tabId' };
  }
  await browser.tabs.update(tabId, { active: true });
  return { status: 200, contentType: 'text/plain', body: 'Tab switched' };
}

async function handleOpenUrl(body) {
  const params = JSON.parse(body);
  const url = params.url;
  const windowId = params.windowId;
  if (!url) {
    return { status: 400, contentType: 'text/plain', body: 'Missing url' };
  }
  const createProperties = { url };
  if (windowId !== undefined) {
    createProperties.windowId = windowId;
  }
  await browser.tabs.create(createProperties);
  return { status: 200, contentType: 'text/plain', body: 'Tab opened' };
}

async function handleCloseTab(body) {
  const params = JSON.parse(body);
  const tabId = params.tabId;
  if (typeof tabId !== 'number') {
    return { status: 400, contentType: 'text/plain', body: 'Missing or invalid tabId' };
  }
  try {
    await browser.tabs.remove(tabId);
  } catch (error) {
    return { status: 404, contentType: 'text/plain', body: 'Tab not found' };
  }
  return { status: 200, contentType: 'text/plain', body: 'Tab closed' };
}

function sendNativeResponse(requestId, response) {
  if (!port) {
    console.error('No native host connection');
    return;
  }
  port.postMessage({
    requestId,
    response: {
      status: response.status,
      contentType: response.contentType,
      body: response.body
    }
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getConfig') {
    sendResponse({ success: true, config: config });
    return true;
  }
  
  if (message.type === 'configUpdated') {
    console.log('Config updated from options page');
    const { port, apiToken } = message.config;
    
    // Validate port
    if (isNaN(port) || port < 1024 || port > 65535) {
      sendResponse({ success: false, error: 'Port must be a number between 1024 and 65535' });
      return true;
    }
    
    // Send to native host
    sendConfigRequest('setConfig', { port, apiToken })
      .then(newConfig => {
        // Update local config with response from native host
        config = { ...config, ...newConfig };
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Failed to save config to native host:', error);
        // Fallback to old behavior (will likely fail on read-only storage)
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

browser.runtime.onStartup.addListener(connectToNativeHost);
browser.runtime.onInstalled.addListener(connectToNativeHost);