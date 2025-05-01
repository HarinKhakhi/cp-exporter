# CP Exporter for Obsidian

This plugin allows you to export competitive programming problems directly into your Obsidian vault.

## Features

- Automatically starts a local server to receive problem exports
- Creates well-structured markdown files for competitive programming problems
- Downloads and locally saves images from problem statements
- Converts remote image links to local references automatically
- Configurable save location within your vault
- Automatic file naming based on problem title
- Pre-defined template with sections for solution, approach, and analysis

## How to Use

1. Install the plugin in Obsidian
2. Configure the save path in the plugin settings
3. The server will automatically start when Obsidian launches
4. Send problem data to `http://localhost:8000/add` (or your configured port) via POST request

## API Endpoint

The plugin exposes a single endpoint:

- `POST /add` - Creates a new file from the provided problem data

Example request body:

```json
{
  "title": "Two Sum",
  "platform": "LeetCode",
  "difficulty": "Easy",
  "tags": ["array", "hash-table"],
  "content": "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.</p><p>Example: <img src='https://example.com/image.png'/></p>",
  "currentCode": "def twoSum(nums, target):\n    # Your code here\n    pass",
  "problemLink": "https://leetcode.com/problems/two-sum/"
}
```

The HTML content can contain image references which will be downloaded and stored locally.

## Image Handling

When a problem statement contains image references:

1. The plugin downloads all images found in the HTML content
2. Images are saved to the configured assets folder (default: `assets` subfolder of your save path)
3. Image references in the HTML are updated to point to the local files
4. The plugin supports various image sources:
   - Regular `<img>` tags
   - Background images in style attributes
   - Video poster attributes

## Settings

- **Port**: The port number for the server (default: 8000)
- **Save Path**: The folder path where problem files will be created (default: "cp-problems")
- **Assets Path**: The subfolder path where images will be saved (default: "assets")

## Development

This plugin is built using TypeScript and Obsidian's Plugin API.

### Building

```bash
npm run dev   # Development build with hot reload
npm run build # Production build
```

## License

MIT
