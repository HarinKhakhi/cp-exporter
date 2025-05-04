// Function to extract problem data from LeetCode page
async function extractLeetCodeData() {
  try {
    // Get problem titleSlug from the URL
    const url = window.location.href;
    const titleSlug = url.split("/problems/")[1]?.split("/")[0];

    if (!titleSlug) {
      throw new Error("Could not extract title slug from URL");
    }

    // Use GraphQL to fetch problem data
    const graphqlResponse = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
              title
              content
              difficulty
              topicTags {
                name
              }
            }
          }
        `,
        variables: {
          titleSlug: titleSlug,
        },
      }),
    });

    const graphqlData = await graphqlResponse.json();
    const questionData = graphqlData.data.question;

    // Parse currently displayed code and language
    let currentCode = "";
    let language = "";
    const codeEditor =
      document.querySelector(".CodeMirror") ||
      document.querySelector(".monaco-editor");

    if (codeEditor) {
      if (document.querySelector(".CodeMirror")) {
        // CodeMirror editor
        currentCode = document
          .querySelector(".CodeMirror")
          .CodeMirror.getValue();

        // Get language from CodeMirror mode
        const mode = document
          .querySelector(".CodeMirror")
          .CodeMirror.getMode().name;
        language = mode === "null" ? "text" : mode;
      } else if (document.querySelector(".monaco-editor")) {
        // Monaco editor - this is more complex and might need a different approach
        // For now, try to get it from the visible content
        const codeLines = document.querySelectorAll(".view-line");
        currentCode = Array.from(codeLines)
          .map((line) => line.textContent)
          .join("\n");

        // Try to get language from Monaco editor
        const languageSelector = document.querySelector("[data-mode-id]");
        if (languageSelector) {
          language = languageSelector.getAttribute("data-mode-id");
        }
      }
    }

    return {
      questionId: questionData.questionFrontendId,
      title: questionData.title,
      content: questionData.content,
      difficulty: questionData.difficulty,
      tags: questionData.topicTags.map((tag) => tag.name),
      problemLink: url,
      currentCode: currentCode,
      language: language,
      timestamp: new Date().toISOString(),
      source: "leetcode",
    };
  } catch (error) {
    console.error("Error extracting LeetCode problem data:", error);
    return null;
  }
}

// Placeholder function to extract problem data from Codeforces
async function extractCodeforcesData() {
  try {
    const url = window.location.href;

    // TODO: Implement actual Codeforces data extraction
    // This is just a placeholder that will be updated later

    return {
      questionId: "placeholder-id",
      title: document.title || "Codeforces Problem",
      content: "Placeholder for Codeforces problem content",
      difficulty: "Medium", // Placeholder
      tags: [], // Placeholder
      problemLink: url,
      currentCode: "", // Placeholder
      language: "cpp", // Placeholder
      timestamp: new Date().toISOString(),
      source: "codeforces",
    };
  } catch (error) {
    console.error("Error extracting Codeforces problem data:", error);
    return null;
  }
}

// Listen for messages from the popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportLeetcodeData") {
    extractLeetCodeData()
      .then((problemData) => {
        console.log(problemData);
        sendResponse(problemData);
      })
      .catch((error) => {
        console.error("Error in extractLeetCodeData:", error);
        sendResponse({ error: error.message });
      });
  } else if (request.action === "exportCodeforcesData") {
    extractCodeforcesData()
      .then((problemData) => {
        console.log(problemData);
        sendResponse(problemData);
      })
      .catch((error) => {
        console.error("Error in extractCodeforcesData:", error);
        sendResponse({ error: error.message });
      });
  } else {
    console.error("Unsupported action:", request.action);
    sendResponse({
      error: `Unsupported action: ${request.action}`,
      message: "This action is not supported by the content script.",
    });
  }
  return true; // Required for async response
});
