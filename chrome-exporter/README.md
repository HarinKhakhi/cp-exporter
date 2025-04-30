# CP Exporter Chrome Extension

A Chrome extension for exporting competitive programming problem data from LeetCode (with support for more platforms planned).

## Project Overview

This project consists of two main components:

- **Chrome Extension (exporter)**: Extracts problem data from LeetCode
- **API Server (receiver)**: Receives and processes the exported data

## Extension Features

- Extracts problem metadata (title, difficulty, tags) from LeetCode
- Captures the current code solution
- Sends data to a configurable API endpoint

## Project Structure

### Chrome Extension (`/exporter`)

- `manifest.json` - Extension configuration with LeetCode-specific permissions
- `popup.html` - User interface for exporting problems
- `popup.js` - Handles user interaction and API communication
- `content.js` - Extracts problem data from LeetCode pages
- `images/` - Extension icons

### API Server (`/receiver`)

- `app.py` - FastAPI server to receive exported problem data
- `requirements.txt` - Python dependencies

## Installation

### Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `exporter` directory

### API Server

1. Navigate to the `receiver` directory
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `fastapi run main.py`

## Usage

1. Navigate to a LeetCode problem page
2. Click the CP Exporter extension icon
3. Optionally modify the API endpoint URL
4. Click "Export Problem"
5. The problem data will be sent to the API server

## Development

- The extension uses Manifest V3
- Permissions are set for `activeTab`, `scripting`, and `storage`
- Host permissions are set for LeetCode and localhost
- The content script runs only on LeetCode pages

## Customization

1. Replace the placeholder icons in the `images/` directory with your own icons
2. Modify the popup interface in `popup.html` and `popup.js`
3. Add your extension logic in `content.js` and `background.js`
4. Update the manifest permissions as needed for your use case
