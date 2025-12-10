// SPDX-License-Identifier: Apache-2.0
const HOST_NAME = 'firefox_api_extension';
let port = null;

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
  } catch (error) {
    console.error('Failed to connect to native host:', error);
    setTimeout(connectToNativeHost, 1000);
  }
}

function handleNativeMessage(message) {
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

browser.runtime.onStartup.addListener(connectToNativeHost);
browser.runtime.onInstalled.addListener(connectToNativeHost);
