console.log("Firefox CP Exporter popup.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const exportBtn = document.getElementById("exportBtn");
  const statusDiv = document.getElementById("status");
  const receiverUrlInput = document.getElementById("receiverUrl");

  const cphExportBtn = document.getElementById("cphExportBtn");
  const cphReceiverUrlInput = document.getElementById("cphReceiverUrl");

  // Load saved receiver URL if available
  browser.storage.local
    .get(["receiverUrl", "cphReceiverUrl"])
    .then((result) => {
      if (result.receiverUrl) {
        receiverUrlInput.value = result.receiverUrl;
      }
      if (result.cphReceiverUrl) {
        cphReceiverUrlInput.value = result.cphReceiverUrl;
      }
    });

  cphExportBtn.addEventListener("click", async () => {
    const cphReceiverUrl = cphReceiverUrlInput.value.trim();
    browser.storage.local.set({ cphReceiverUrl });

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    const currentUrl = tabs[0].url;
    const supportedSites = ["codeforces.com"];
    const isOnSupportedSite = supportedSites.some((site) =>
      currentUrl.includes(site)
    );

    if (!isOnSupportedSite) {
      showStatus(
        "Please navigate to a supported problem page (Codeforces)",
        "error"
      );
      return;
    }

    const action = "exportCodeforcesData";
    browser.tabs
      .sendMessage(tabs[0].id, { action: action })
      .then(async (response) => {
        if (!response) {
          showStatus("Failed to extract problem data", "error");
          return;
        }

        const baseUrl = cphReceiverUrl || "http://localhost:27121";
        const apiEndpoint = `${baseUrl}/`;

        const cphData = {
          name: response.cphTitle,
          group: "",
          url: response.problemLink,
          interactive: response.interactive,
          memoryLimit: response.memoryLimit,
          timeLimit: response.timeLimit,
          tests: response.tests,
          testType: "single",
          input: {
            type: "stdin",
          },
          output: {
            type: "stdout",
          },
          languages: {
            java: {
              mainClass: "Main",
              taskClass: "",
            },
          },
        };

        console.log("Sending data to:", apiEndpoint);
        try {
          const result = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cphData),
          });
          if (result.ok) {
            showStatus("Problem exported to CPH successfully!", "success");
          } else {
            showStatus("Failed to export problem to CPH", "error");
          }
        } catch (error) {
          console.error("API Error:", error);
          showStatus("Failed to connect to API", "error");
        }
      })
      .catch((error) => {
        console.error("Message Error:", error);
        showStatus("Failed to communicate with content script", "error");
      });
  });

  exportBtn.addEventListener("click", async () => {
    try {
      // Save the receiver URL
      const receiverUrl = receiverUrlInput.value.trim();
      browser.storage.local.set({ receiverUrl });

      // Get the active tab
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check if we're on a supported CP site
      const currentUrl = tabs[0].url;
      const supportedSites = ["leetcode.com", "codeforces.com"];
      const isOnSupportedSite = supportedSites.some((site) =>
        currentUrl.includes(site)
      );

      if (!isOnSupportedSite) {
        showStatus(
          "Please navigate to a supported problem page (LeetCode, Codeforces)",
          "error"
        );
        return;
      }

      // Determine which site we're on and use appropriate action
      let action = "exportProblem";

      if (currentUrl.includes("codeforces.com")) {
        action = "exportCodeforcesData";
      } else if (currentUrl.includes("leetcode.com")) {
        action = "exportLeetcodeData";
      }

      // Send message to content script to get problem data
      browser.tabs
        .sendMessage(tabs[0].id, { action: action })
        .then(async (response) => {
          if (!response) {
            showStatus("Failed to extract problem data", "error");
            return;
          }

          try {
            const baseUrl = receiverUrl || "http://localhost:8000";
            const apiEndpoint = `${baseUrl}/add`;

            console.log("Sending data to:", apiEndpoint);
            const result = await fetch(apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            });

            if (result.ok) {
              showStatus("Problem exported successfully!", "success");
            } else {
              showStatus("Failed to export problem", "error");
            }
          } catch (error) {
            console.error("API Error:", error);
            showStatus("Failed to connect to API", "error");
          }
        })
        .catch((error) => {
          console.error("Message Error:", error);
          showStatus("Failed to communicate with content script", "error");
        });
    } catch (error) {
      console.error("Error:", error);
      showStatus("An error occurred", "error");
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";

    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }
});
