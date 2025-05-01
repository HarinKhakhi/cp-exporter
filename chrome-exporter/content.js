// Function to extract problem data from LeetCode page
async function extractProblemData() {
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
    };
  } catch (error) {
    console.error("Error extracting problem data:", error);
    return null;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportProblem") {
    extractProblemData()
      .then((problemData) => {
        console.log(problemData);
        sendResponse(problemData);
      })
      .catch((error) => {
        console.error("Error in extractProblemData:", error);
        sendResponse({ error: error.message });
      });
  }
  return true; // Required for async response
});
