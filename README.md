# Firefox REST API Extension

This Firefox extension exposes a REST API on localhost to interact with browser windows and tabs.

## Features

 - **GET /windows** - Returns information about all windows and their tabs
 - **GET /tabs** - Returns information about all tabs across all windows
 - **POST /switch-tab** - Switches to a specific tab by ID
 - **POST /open-url** - Opens a URL in a new tab (optionally in a specific window)
 - **POST /close-tab** - Closes a tab by ID

## Architecture

The extension uses Firefox's Native Messaging API to communicate with a local Node.js HTTP server. The server runs on `localhost:8090` and forwards HTTP requests to the extension, which then calls the browser's `tabs` and `windows` APIs.

## Installation

### 1. Install the native messaging host

Run the installation script:

```bash
./install-host.sh
```

This copies the native host manifest to `~/.mozilla/native-messaging-hosts/`.

### 2. Load the extension in Firefox

You can load the extension temporarily using `web-ext`:

```bash
npm install
npx web-ext run
```

Or manually via `about:debugging`:
- Open `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on"
- Select any file in the extension directory (e.g., `manifest.json`)

## Usage

Once the extension is running, you can make HTTP requests to `http://localhost:8090`.

### Examples

**Get windows and tabs:**
```bash
curl http://localhost:8090/windows
curl http://localhost:8090/tabs
```

**Switch to tab with ID 123:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"tabId": 123}' http://localhost:8090/switch-tab
```

**Open a URL in a new tab:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"url": "https://example.com"}' http://localhost:8090/open-url
```

 **Open a URL in a specific window:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"url": "https://example.com", "windowId": 2}' http://localhost:8090/open-url
```

 **Close a tab by ID:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"tabId": 123}' http://localhost:8090/close-tab
```

**With API Token (if enabled):**
```bash
curl -H "Authorization: Bearer your-token-here" http://localhost:8090/windows
curl -H "X-API-Token: Bearer your-token-here" http://localhost:8090/tabs
```

## Development

- `manifest.json` - Extension manifest with permissions for `tabs`, `activeTab`, and `nativeMessaging`.
- `background.js` - Background script that connects to the native host and handles API requests.
- `native/native_host.js` - Native host HTTP server (Node.js).
- `native/firefox_api_host.json` - Native messaging host manifest.
- `install-host.sh` - Installation script for the native host.

### Configuration

The extension includes an options page for configuration:

1. Right-click the extension icon in Firefox toolbar and select "Manage Extension"
2. Go to the "Options" tab
3. Configure the API port (default: 8090) and optional API token

#### API Token Authentication

If an API token is set in the options:
- All API requests must include the token in the `Authorization` header as a Bearer token
- Example: `Authorization: Bearer your-token-here`
- Requests without a valid token will receive a 401 Unauthorized response

### Changing the HTTP port

You can change the port via the options page, or edit `native/native_host.js` and change the default `port` in the config object (line 8). Ensure the port is free.

## Building and Releasing

This project uses GitHub Actions to automatically build and release the extension when a new tag is pushed.

### Automated Builds

When a tag starting with 'v' (e.g., `v1.0.0`) is pushed to the repository:
1. The GitHub Actions workflow builds the extension using `web-ext`
2. The native host files are packaged into a tarball
3. Both the extension (.xpi/.zip) and native host package are attached to the GitHub release

### Prerequisites

- Node.js 18 or later
- npm (usually comes with Node.js)

### Manual Building

To build the extension locally:

```bash
npm install
npm run lint
npm run build
```

The built extension will be in the `web-ext-artifacts/` directory.

### Release Process

1. Update the version in `manifest.json`
2. Commit changes
3. Create and push a tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. The GitHub Actions workflow will create a release with the built artifacts

## Notes

- The native host must be executable (`chmod +x native/native_host.js`).
- Firefox must be restarted after installing the native host manifest.
- The extension only works while Firefox is running.

## License

Apache 2.0