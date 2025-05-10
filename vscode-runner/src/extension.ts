import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("CP Runner is now active!");

  // Command to fetch test cases from problem URL
  let fetchTestCases = vscode.commands.registerCommand(
    "cp-runner.fetchTestCases",
    async () => {
      // Get problem URL from user
      const url = await vscode.window.showInputBox({
        prompt: "Enter the problem URL (LeetCode, CodeForces, etc.)",
        placeHolder: "https://...",
      });

      if (!url) {
        return;
      }

      // TODO: Implement test case fetching logic
      vscode.window.showInformationMessage(`Fetching test cases from: ${url}`);
    }
  );

  // Command to run current test case
  let runCurrentTestCase = vscode.commands.registerCommand(
    "cp-runner.runCurrentTestCase",
    () => {
      // TODO: Implement running current test case
      vscode.window.showInformationMessage("Running current test case");
    }
  );

  // Command to run all test cases
  let runAllTestCases = vscode.commands.registerCommand(
    "cp-runner.runAllTestCases",
    () => {
      // TODO: Implement running all test cases
      vscode.window.showInformationMessage("Running all test cases");
    }
  );

  context.subscriptions.push(fetchTestCases);
  context.subscriptions.push(runCurrentTestCase);
  context.subscriptions.push(runAllTestCases);
}

export function deactivate() {}
