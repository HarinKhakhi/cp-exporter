console.log("popup.js");

document.addEventListener("DOMContentLoaded", function () {
  const exportBtn = document.getElementById("exportBtn");
  const statusDiv = document.getElementById("status");
  const receiverUrlInput = document.getElementById("receiverUrl");

  exportBtn.addEventListener("click", async () => {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check if we're on LeetCode
      if (!tab.url.includes("leetcode.com")) {
        showStatus("Please navigate to a LeetCode problem page", "error");
        return;
      }

      // Send message to content script to get problem data
      chrome.tabs.sendMessage(
        tab.id,
        { action: "exportProblem" },
        async (response) => {
          if (!response) {
            showStatus("Failed to extract problem data", "error");
            return;
          }

          try {
            const baseUrl =
              receiverUrlInput.value.trim() || "http://localhost:8000";
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
        }
      );
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
