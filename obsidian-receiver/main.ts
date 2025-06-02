import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  RequestUrlResponse,
  Setting,
  TFile,
} from "obsidian";
import { requestUrl } from "obsidian";

interface CpExporterSettings {
  port: string;
  savePath: string;
  assetsPath: string;
}

const DEFAULT_SETTINGS: CpExporterSettings = {
  port: "8000",
  savePath: "",
  assetsPath: "assets",
};

export default class CpExporterPlugin extends Plugin {
  settings: CpExporterSettings;
  server: any;
  statusBarItem: HTMLElement;
  pendingDownloads = 0;

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
      const title = `${data.questionId} ${data.title}` || "Untitled Problem";
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
        return {
          status: "success",
          message: `File created: ${newFileName}`,
          downloadedImages:
            this.pendingDownloads > 0
              ? `Downloading ${this.pendingDownloads} images...`
              : undefined,
        };
      } else {
        await this.app.vault.create(fileName, content);
        return {
          status: "success",
          message: `File created: ${fileName}`,
          downloadedImages:
            this.pendingDownloads > 0
              ? `Downloading ${this.pendingDownloads} images...`
              : undefined,
        };
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
    // Process content to download and update image links if any exist
    let processedContent = data.content || "";

    if (processedContent) {
      // Remove all newline characters from the content
      processedContent = processedContent.replace(/\n/g, "");
      processedContent = this.processHtmlImages(
        processedContent,
        data.title || "Untitled Problem"
      );
    }

    return `---
link: ${data.problemLink || ""}
platform: ${data.platform || ""}
difficulty: ${data.difficulty || ""}
p_tags:
  - ${data.tags ? data.tags.join("\n  - ") : ""}
time_taken: ${data.timeTaken || "-1"}
score: 0
tags: 
---
# Solution 1
## Approach


## Analysis
Time: 
Space: 

## Code
\`\`\`${data.language || ""}
${data.currentCode || ""}
\`\`\`
`;
  }

  /**
   * Process HTML content to find image links, download them, and update links
   */
  processHtmlImages(htmlContent: string, problemTitle: string): string {
    try {
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Check if parsing was successful
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        console.error("HTML parsing error:", parseError.textContent);
        return htmlContent; // Return original content on error
      }

      // Keep track of images to download
      const imageDownloadQueue: {
        url: string;
        localPath: string;
        element: HTMLElement;
        attribute?: string;
      }[] = [];

      // Reset pending downloads count
      this.pendingDownloads = 0;

      // Process regular <img> tags
      this.processImgTags(doc, problemTitle, imageDownloadQueue);

      // Process background images and other attributes that might contain images
      this.processBackgroundImages(doc, problemTitle, imageDownloadQueue);

      // Schedule downloads to happen asynchronously
      if (imageDownloadQueue.length > 0) {
        this.pendingDownloads = imageDownloadQueue.length;
        this.downloadImages(imageDownloadQueue);
      }

      // Return the updated HTML content
      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error processing HTML content:", error);
      return htmlContent; // Return original content on error
    }
  }

  /**
   * Process regular <img> tags in HTML content
   */
  processImgTags(
    doc: Document,
    problemTitle: string,
    imageDownloadQueue: {
      url: string;
      localPath: string;
      element: HTMLElement;
      attribute?: string;
    }[]
  ): void {
    // Find all images in the content
    const images = doc.querySelectorAll("img");

    // No images found, return
    if (images.length === 0) {
      return;
    }

    // Process each image
    images.forEach((img, index) => {
      const src = img.getAttribute("src");
      if (!src) return;

      // Skip data URLs
      if (src.startsWith("data:")) {
        return;
      }

      // Skip already local references
      if (
        src.startsWith("./") ||
        src.startsWith("../") ||
        src.startsWith(this.settings.assetsPath)
      ) {
        return;
      }

      try {
        // Get full URL and generate local filename
        const { fullUrl, localPath } = this.prepareImageDownload(
          src,
          problemTitle,
          `img-${index + 1}`
        );

        // Add to download queue
        imageDownloadQueue.push({
          url: fullUrl,
          localPath: localPath,
          element: img,
          attribute: "src",
        });

        // Update the image source to point to the local file
        img.setAttribute("src", localPath);
      } catch (error) {
        console.error(`Error processing image ${src}:`, error);
      }
    });
  }

  /**
   * Process elements with background images or other image-containing attributes
   */
  processBackgroundImages(
    doc: Document,
    problemTitle: string,
    imageDownloadQueue: {
      url: string;
      localPath: string;
      element: HTMLElement;
      attribute?: string;
    }[]
  ): void {
    // Elements that might have background images
    const elementsWithStyles = doc.querySelectorAll("[style]");
    let bgImageCount = 0;

    // Process inline style attributes for background images
    elementsWithStyles.forEach((element) => {
      const style = element.getAttribute("style");
      if (!style) return;

      // Check for background-image or background with url()
      const bgImageMatch = style.match(
        /background(-image)?:\s*url\(['"]?([^'")]+)['"]?\)/i
      );
      if (!bgImageMatch) return;

      const imageUrl = bgImageMatch[2];

      // Skip data URLs
      if (imageUrl.startsWith("data:")) {
        return;
      }

      // Skip already local references
      if (
        imageUrl.startsWith("./") ||
        imageUrl.startsWith("../") ||
        imageUrl.startsWith(this.settings.assetsPath)
      ) {
        return;
      }

      try {
        // Get full URL and generate local filename
        const { fullUrl, localPath } = this.prepareImageDownload(
          imageUrl,
          problemTitle,
          `bg-${++bgImageCount}`
        );

        // Add to download queue
        imageDownloadQueue.push({
          url: fullUrl,
          localPath: localPath,
          element: element as HTMLElement,
          attribute: "style",
        });

        // Update the background image URL in the style attribute
        const updatedStyle = style.replace(
          bgImageMatch[0],
          `background${bgImageMatch[1] || ""}:url('${localPath}')`
        );
        element.setAttribute("style", updatedStyle);
      } catch (error) {
        console.error(`Error processing background image ${imageUrl}:`, error);
      }
    });

    // Look for other elements with image attributes (like video poster, etc.)
    const videoElements = doc.querySelectorAll("video[poster]");
    videoElements.forEach((video, index) => {
      const poster = video.getAttribute("poster");
      if (!poster) return;

      // Skip data URLs and local references
      if (
        poster.startsWith("data:") ||
        poster.startsWith("./") ||
        poster.startsWith("../") ||
        poster.startsWith(this.settings.assetsPath)
      ) {
        return;
      }

      try {
        // Get full URL and generate local filename
        const { fullUrl, localPath } = this.prepareImageDownload(
          poster,
          problemTitle,
          `poster-${index + 1}`
        );

        // Add to download queue
        imageDownloadQueue.push({
          url: fullUrl,
          localPath: localPath,
          element: video as HTMLElement,
          attribute: "poster",
        });

        // Update the poster attribute
        video.setAttribute("poster", localPath);
      } catch (error) {
        console.error(`Error processing video poster ${poster}:`, error);
      }
    });
  }

  /**
   * Prepare image download by resolving URL and generating local path
   */
  prepareImageDownload(
    srcUrl: string,
    problemTitle: string,
    prefix: string
  ): { fullUrl: string; localPath: string } {
    // Resolve relative URL if needed
    let fullUrl = srcUrl;

    // If it's a relative URL without protocol (starts with /)
    if (srcUrl.startsWith("/") && !srcUrl.startsWith("//")) {
      // Default to https if we can't determine the base
      fullUrl = `https:${srcUrl}`;
    } else if (!srcUrl.includes("://") && !srcUrl.startsWith("//")) {
      // Relative URL without leading slash, assume https
      fullUrl = `https://${srcUrl}`;
    }

    // Generate a unique filename for the image
    let originalFilename;

    try {
      const urlObj = new URL(fullUrl);
      const pathParts = urlObj.pathname.split("/");
      originalFilename = pathParts[pathParts.length - 1];

      // If filename is empty or just a slash, use a default name with the prefix
      if (!originalFilename || originalFilename === "/") {
        originalFilename = `${prefix}`;
      }
    } catch (e) {
      // If URL parsing fails, create a fallback filename
      originalFilename = `${prefix}`;
    }

    // If filename doesn't have an extension, give it one based on URL or default to .png
    if (!originalFilename.includes(".")) {
      if (fullUrl.includes(".png")) originalFilename += ".png";
      else if (fullUrl.includes(".jpg") || fullUrl.includes(".jpeg"))
        originalFilename += ".jpg";
      else if (fullUrl.includes(".gif")) originalFilename += ".gif";
      else if (fullUrl.includes(".svg")) originalFilename += ".svg";
      else originalFilename += ".png";
    }

    // Create unique filename to avoid collisions
    const sanitizedProblemTitle = this.sanitizeFilename(problemTitle);
    const filename = `${sanitizedProblemTitle}-${prefix}-${originalFilename}`;

    // Construct local path for the image
    const assetsPath = this.settings.assetsPath || "assets";
    const relativePath = `${assetsPath}/${filename}`;

    return { fullUrl, localPath: relativePath };
  }

  /**
   * Download images to the vault's assets folder
   */
  async downloadImages(
    imageQueue: {
      url: string;
      localPath: string;
      element: HTMLElement;
      attribute?: string;
    }[]
  ) {
    // Ensure the assets folder exists
    const assetsPath = this.settings.assetsPath || "assets";
    const fullAssetsPath = `${this.settings.savePath}/${assetsPath}`;

    if (!(await this.app.vault.adapter.exists(fullAssetsPath))) {
      await this.app.vault.createFolder(fullAssetsPath);
    }

    const totalImages = imageQueue.length;
    let downloadedCount = 0;
    let failedCount = 0;

    // Download each image
    for (const item of imageQueue) {
      try {
        // Try to download the image with retries
        const maxRetries = 3;
        let lastError = null;

        for (let retry = 0; retry < maxRetries; retry++) {
          try {
            // Download the image
            const response = await this.safeRequest(item.url);

            // Check if we got a valid response
            if (!response) {
              throw new Error("Empty response");
            }

            // Convert response to binary
            const arrayBuffer = response.arrayBuffer;

            // Save the image to the assets folder
            const filePath = `${this.settings.savePath}/${item.localPath}`;
            if (await this.app.vault.adapter.exists(filePath)) {
              console.log(`Skipping: ${filePath} already exists!`);
              break;
            }

            await this.app.vault.createBinary(filePath, arrayBuffer);

            console.log(`Downloaded image: ${item.url} to ${filePath}`);
            downloadedCount++;

            // Success, break out of retry loop
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            console.error(
              `Attempt ${retry + 1}/${maxRetries} failed for ${item.url}:`,
              error
            );

            // Wait before retrying (exponential backoff)
            if (retry < maxRetries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, retry))
              );
            }
          }
        }

        // If all retries failed, log the final error
        if (lastError) {
          throw lastError;
        }
      } catch (error) {
        console.error(
          `Failed to download image ${item.url} after retries:`,
          error
        );
        failedCount++;
      }

      // Update pending downloads count
      this.pendingDownloads--;
    }

    // Show final notification about downloads
    this.showDownloadNotification(downloadedCount, failedCount);
  }

  /**
   * Safe request with timeout and error handling
   */
  async safeRequest(
    url: string,
    timeoutMs = 10000
  ): Promise<RequestUrlResponse | null> {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Make the request with timeout
      const response = await requestUrl({
        url: url,
        method: "GET",
        headers: {
          "User-Agent": "Obsidian/1.0 (compatible; CP-Exporter-Plugin)",
        },
        contentType: "image/png",
      });

      // Clear timeout
      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      return null;
    }
  }

  /**
   * Show download notification
   */
  showDownloadNotification(downloadedCount: number, failedCount: number) {
    const totalImages = downloadedCount + failedCount;
    if (totalImages > 0) {
      if (failedCount === 0) {
        new Notice(`Downloaded ${downloadedCount} images successfully.`);
      } else {
        new Notice(
          `Downloaded ${downloadedCount} images. Failed to download ${failedCount} images.`
        );
      }
    }
  }

  /**
   * Handle POST requests to /add endpoint
   */
  async handleAddRequest(req: any, res: any, body: string) {
    try {
      const data = JSON.parse(body);
      console.log("Received data:", data);

      // Create the file and get the result
      const result = await this.createCpProblemFile(data);

      // Show a notification
      new Notice(result.message);

      // Show additional notification about image downloads if applicable
      if (result.downloadedImages) {
        new Notice(result.downloadedImages);
      }

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
            await this.handleAddRequest(req, res, body);
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

    new Setting(containerEl)
      .setName("Assets Path")
      .setDesc("Path where image assets will be saved (relative to save path)")
      .addText((text) =>
        text
          .setPlaceholder("assets")
          .setValue(this.plugin.settings.assetsPath)
          .onChange(async (value) => {
            this.plugin.settings.assetsPath = value;
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
