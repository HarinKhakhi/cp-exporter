# CP Exporter for Obsidian

This plugin allows you to export competitive programming problems directly into your Obsidian vault.

## Features

- Automatically starts a local server to receive problem exports
- Creates well-structured markdown files for competitive programming problems
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
  "source": "LeetCode",
  "difficulty": "Easy",
  "tags": ["array", "hash-table"],
  "problem": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "initialCode": "def twoSum(nums, target):\n    # Your code here\n    pass"
}
```

## Settings

- **Port**: The port number for the server (default: 8000)
- **Save Path**: The folder path where problem files will be created (default: "cp-problems")

## Development

This plugin is built using TypeScript and Obsidian's Plugin API.

### Building

```bash
npm run dev   # Development build with hot reload
npm run build # Production build
```

## License

MIT
