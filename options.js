// SPDX-License-Identifier: Apache-2.0
document.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'getConfig' });
    
    if (response.success) {
      document.getElementById('port').value = response.config.port;
      document.getElementById('apiToken').value = response.config.apiToken;
    } else {
      console.error('Failed to load config from background:', response.error);
      showStatus('Error loading settings', 'error');
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
    const response = await browser.runtime.sendMessage({
      type: 'configUpdated',
      config: { port, apiToken }
    });
    
    if (response.success) {
      showStatus('Settings saved successfully. Restart the native host for changes to take effect.', 'success');
    } else {
      showStatus(`Error saving settings: ${response.error}`, 'error');
    }
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