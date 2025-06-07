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
      platform: "leetcode",
    };
  } catch (error) {
    console.error("Error extracting LeetCode problem data:", error);
    return null;
  }
}

function getLastTextNode(elem, selector) {
  let selectedNode = elem.querySelector(selector);

  const styledNode = selectedNode.querySelector(
    ".tex-font-style-sl, .tex-font-style-bf"
  );
  if (styledNode !== null) {
    selectedNode = styledNode;
  }

  const textNodes = [...selectedNode.childNodes].filter(
    (node) => node.nodeType === Node.TEXT_NODE
  );
  return textNodes[textNodes.length - 1];
}

function decodeHtml(html) {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseMainTestBlock(block) {
  const lines = [...block.querySelectorAll(".test-example-line")].filter(
    (el) => el.querySelector(".test-example-line, br") === null
  );

  if (lines.length === 0) {
    return decodeHtml(block.innerHTML);
  }

  return [...lines].map((el) => decodeHtml(el.innerHTML)).join("\n");
}

function getTest(input, output) {
  function correctData(data, normalizeWhitespace) {
    data = data.replace(
      '<div class="open_grepper_editor" title="Edit & Save To Grepper"></div>',
      ""
    );

    if (normalizeWhitespace) {
      data = data
        .replace(/<br>/g, "\n")
        .replace(/&nbsp;/g, "")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trimEnd();
    }

    return data.endsWith("\n") || data.length === 0 ? data : data + "\n";
  }
  return {
    input: correctData(input, true),
    output: correctData(output, true),
  };
}

// Function to extract problem data from Codeforces
async function extractCodeforcesData() {
  try {
    const url = window.location.href;

    // Extract contest ID and problem index from URL
    // URL formats:
    // - https://codeforces.com/problemset/problem/1234/A
    // - https://codeforces.com/contest/1234/problem/A
    // - https://codeforces.com/gym/123456/problem/A
    let urlParts = url.split("/");
    let contestId = "";
    let problemIndex = "";

    if (url.includes("/problemset/problem/")) {
      contestId = urlParts[urlParts.indexOf("problem") + 1];
      problemIndex = urlParts[urlParts.indexOf("problem") + 2];
    } else if (url.includes("/contest/") || url.includes("/gym/")) {
      const contestPos = url.includes("/contest/")
        ? urlParts.indexOf("contest")
        : urlParts.indexOf("gym");
      contestId = urlParts[contestPos + 1];
      problemIndex = urlParts[urlParts.indexOf("problem") + 1];
    } else {
      throw new Error("Unsupported Codeforces URL format");
    }

    // Get problem title
    const titleElement = document.querySelector(".problem-statement .title");
    let title = "";
    if (titleElement) {
      // Remove the problem index (like "A. ") from the title
      title = titleElement.textContent.trim();
      if (title.startsWith(problemIndex + ".")) {
        title = title.substring(problemIndex.length + 1).trim();
      } else if (title.startsWith(problemIndex + ". ")) {
        title = title.substring(problemIndex.length + 2).trim();
      }
    }

    // Extract tags
    const tagElements = document.querySelectorAll(".tag-box");
    const allTags = Array.from(tagElements).map((tag) =>
      tag.textContent.trim()
    );

    // Extract difficulty from tags and filter difficulty tags from the final tags array
    let difficulty = "";
    const tags = allTags.filter((tag) => {
      if (tag.startsWith("*")) {
        // Tag is in format "*num" where num is the difficulty rating
        difficulty = `"${tag.substring(1)}"`; // Remove the * character and wrap in quotes
        return false; // Filter out this tag
      }
      return true; // Keep other tags
    });

    const timeLimitNode = getLastTextNode(
      document,
      ".problem-statement > .header > .time-limit"
    );
    const timeLimitStr = timeLimitNode.textContent.split(" ")[0];
    const timeLimit = parseFloat(timeLimitStr) * 1000;

    const memoryLimitNode = getLastTextNode(
      document,
      ".problem-statement > .header > .memory-limit"
    );
    const memoryLimitStr = memoryLimitNode.textContent.split(" ")[0];
    const memoryLimit = parseInt(memoryLimitStr, 10);

    const inputs = document.querySelectorAll(".input pre");
    const outputs = document.querySelectorAll(".output pre");

    const tests = [];
    for (let i = 0; i < inputs.length && i < outputs.length; i++) {
      tests.push(
        getTest(parseMainTestBlock(inputs[i]), parseMainTestBlock(outputs[i]))
      );
    }

    const cphTitle = document
      .querySelector(".problem-statement > .header > .title")
      .textContent.trim();

    return {
      questionId: `${contestId} ${problemIndex}`,
      title: title,
      content: "",
      difficulty: difficulty,
      tags: tags,
      problemLink: url,
      currentCode: "", // Empty as requested
      language: "", // We'll leave language empty for now
      timestamp: new Date().toISOString(),
      platform: "codeforces",
      timeLimit: timeLimit,
      memoryLimit: memoryLimit,
      tests: tests,
      interactive: false,
      cphTitle: cphTitle,
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
