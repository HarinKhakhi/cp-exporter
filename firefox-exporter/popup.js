console.log("Firefox CP Exporter popup.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const exportBtn = document.getElementById("exportBtn");
  const statusDiv = document.getElementById("status");
  const receiverUrlInput = document.getElementById("receiverUrl");

  // Load saved receiver URL if available
  browser.storage.local.get("receiverUrl").then((result) => {
    if (result.receiverUrl) {
      receiverUrlInput.value = result.receiverUrl;
    }
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

      // Check if we're on LeetCode
      if (!tabs[0].url.includes("leetcode.com")) {
        showStatus("Please navigate to a LeetCode problem page", "error");
        return;
      }

      // Send message to content script to get problem data
      browser.tabs
        .sendMessage(tabs[0].id, { action: "exportProblem" })
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
