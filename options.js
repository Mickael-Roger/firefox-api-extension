// SPDX-License-Identifier: Apache-2.0
document.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
  try {
    const result = await browser.storage.local.get(['port', 'apiToken']);
    
    if (result.port !== undefined) {
      document.getElementById('port').value = result.port;
    }
    
    if (result.apiToken !== undefined) {
      document.getElementById('apiToken').value = result.apiToken;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

document.getElementById('save').addEventListener('click', saveSettings);

async function saveSettings() {
  const port = parseInt(document.getElementById('port').value);
  const apiToken = document.getElementById('apiToken').value.trim();
  
  if (isNaN(port) || port < 1024 || port > 65535) {
    showStatus('Port must be a number between 1024 and 65535', 'error');
    return;
  }
  
  try {
    await browser.storage.local.set({
      port: port,
      apiToken: apiToken
    });
    
    showStatus('Settings saved successfully. Restart the native host for changes to take effect.', 'success');
    
    // Notify background script about configuration change
    browser.runtime.sendMessage({
      type: 'configUpdated',
      config: { port, apiToken }
    }).catch(() => {
      // Background script might not be listening, that's ok
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  
  setTimeout(() => {
    status.className = 'status';
  }, 5000);
}