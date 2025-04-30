# CP Exporter (Firefox Extension)

A Firefox browser extension that exports coding problem data from platforms like LeetCode to a local server.

## Features

- Export problem details including title, content, difficulty, and tags
- Export your current code solution
- Configurable receiver URL to send the data to a local server

## Installation

### Temporary Installation (for Development)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click on "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to the `firefox-exporter` directory and select any file (such as `manifest.json`)

### Permanent Installation

1. Zip the contents of the `firefox-exporter` directory
2. Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/)
3. Sign in or create an account
4. Submit your add-on for review

## Usage

1. Navigate to a LeetCode problem page
2. Click on the CP Exporter icon in the Firefox toolbar
3. Set the receiver URL if needed (default is `http://localhost:8000`)
4. Click "Export Problem"
5. The problem data will be sent to the specified URL

## Server Setup

This extension needs a server to receive the exported data. You can use the companion project `obsidian-receiver` for this purpose.

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current tab's content
- `storage`: To store the receiver URL
- `https://leetcode.com/*`: To interact with LeetCode pages
- `http://localhost/*`: To send data to the local server

## License

MIT

## Credits

This project is a Firefox port of the chrome-exporter extension.
