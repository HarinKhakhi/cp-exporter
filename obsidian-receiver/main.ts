import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

interface CpExporterSettings {
  port: string;
  savePath: string;
}

const DEFAULT_SETTINGS: CpExporterSettings = {
  port: "8000",
  savePath: "",
};

export default class CpExporterPlugin extends Plugin {
  settings: CpExporterSettings;
  server: any;
  statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Add the settings tab
    this.addSettingTab(new CpExporterSettingTab(this.app, this));

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar("Stopped");

    // Start server automatically when plugin loads
    this.startServer();
  }

  onunload() {
    this.stopServer();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  updateStatusBar(status: string) {
    this.statusBarItem.setText(`CP Exporter: ${status}`);
  }

  /**
   * Creates a new file with CP problem content
   */
  async createCpProblemFile(data: any) {
    try {
      // Ensure save path exists
      const folderPath = this.settings.savePath;
      if (!(await this.app.vault.adapter.exists(folderPath))) {
        await this.app.vault.createFolder(folderPath);
      }

      // Generate filename from problem title or use a default
      const title = data.title || "Untitled Problem";
      const fileName = `${folderPath}/${this.sanitizeFilename(title)}.md`;

      // Create file content with YAML frontmatter and sections
      const content = this.generateFileContent(data);

      // Create the file
      if (await this.app.vault.adapter.exists(fileName)) {
        // If file exists, append timestamp to filename
        const timestamp = Date.now();
        const newFileName = `${folderPath}/${this.sanitizeFilename(
          title
        )}-${timestamp}.md`;
        await this.app.vault.create(newFileName, content);
        return { status: "success", message: `File created: ${newFileName}` };
      } else {
        await this.app.vault.create(fileName, content);
        return { status: "success", message: `File created: ${fileName}` };
      }
    } catch (error) {
      console.error("Error creating file:", error);
      return {
        status: "error",
        message: `Failed to create file: ${error.message}`,
      };
    }
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "-").trim();
  }

  /**
   * Generate file content with frontmatter and sections
   */
  generateFileContent(data: any): string {
    return `---
link: ${data.problemLink || ""}
platform: ${data.platform || ""}
difficulty: ${data.difficulty || ""}
p_tags:
  - ${data.tags ? data.tags.join("\n  - ") : ""}
time_taken: ${data.timeTaken || "-1"}
tags: 
---
${data.content || ""}

# Solution 1
## Approach

## Analysis
Time: 
Space: 

## Code
\`\`\`
${data.currentCode || ""}
\`\`\`
`;
  }

  startServer() {
    if (this.server) {
      new Notice("Server is already running");
      return;
    }

    try {
      const http = require("http");
      const port = parseInt(this.settings.port);

      this.server = http.createServer((req: any, res: any) => {
        // Enable CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        // Handle preflight requests
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // Log request info
        console.log(`${req.method} ${req.url}`);

        // Handle POST to add endpoint
        if (req.method === "POST" && req.url === "/add") {
          let body = "";

          req.on("data", (chunk: any) => {
            body += chunk.toString();
          });

          req.on("end", async () => {
            try {
              const data = JSON.parse(body);
              console.log("Received data:", data);

              // Create the file and get the result
              const result = await this.createCpProblemFile(data);

              // Show a notification
              new Notice(result.message);

              // Send response
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (error) {
              console.error("Error processing request:", error);
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  status: "error",
                  message: `Error processing request: ${error.message}`,
                })
              );
            }
          });

          return;
        }

        // Default 404 response for other endpoints
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Not found" }));
      });

      this.server.listen(port, "0.0.0.0", () => {
        console.log(`CP Exporter server running on port ${port}`);
        new Notice(`CP Exporter server started on port ${port}`);
        this.updateStatusBar(`Running on port ${port}`);
      });

      this.server.on("error", (error: any) => {
        console.error("Server error:", error);
        new Notice(`Server error: ${error.message}`);
        this.server = null;
        this.updateStatusBar("Error");
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      new Notice(`Failed to start server: ${error.message}`);
      this.updateStatusBar("Error");
    }
  }

  stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      new Notice("CP Exporter server stopped");
      this.updateStatusBar("Stopped");
      console.log("CP Exporter server stopped");
    }
  }
}

class CpExporterSettingTab extends PluginSettingTab {
  plugin: CpExporterPlugin;

  constructor(app: App, plugin: CpExporterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "CP Exporter Settings" });

    new Setting(containerEl)
      .setName("Port")
      .setDesc("The port to run the server on")
      .addText((text) =>
        text
          .setPlaceholder("8000")
          .setValue(this.plugin.settings.port)
          .onChange(async (value) => {
            this.plugin.settings.port = value;
            await this.plugin.saveSettings();

            // Restart server if running
            if (this.plugin.server) {
              this.plugin.stopServer();
              this.plugin.startServer();
            }
          })
      );

    new Setting(containerEl)
      .setName("Save Path")
      .setDesc(
        "Path where problem files will be saved (relative to vault root)"
      )
      .addText((text) =>
        text
          .setPlaceholder("cp-problems")
          .setValue(this.plugin.settings.savePath)
          .onChange(async (value) => {
            this.plugin.settings.savePath = value;
            await this.plugin.saveSettings();
          })
      );

    // Add server control buttons
    const serverControlDiv = containerEl.createDiv();
    serverControlDiv.style.marginTop = "20px";

    const startButton = serverControlDiv.createEl("button", {
      text: "Start Server",
    });
    startButton.style.marginRight = "10px";
    startButton.onclick = () => this.plugin.startServer();

    const stopButton = serverControlDiv.createEl("button", {
      text: "Stop Server",
    });
    stopButton.onclick = () => this.plugin.stopServer();
  }
}
