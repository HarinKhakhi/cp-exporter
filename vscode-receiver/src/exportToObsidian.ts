import * as vscode from 'vscode';
import { Problem } from './types';
import { getProblem } from './parser';
import * as cheerio from 'cheerio';

const getData = async (problemUrl: string) => {
    const res = await fetch(problemUrl);
    const page = await res.text();
    const $ = cheerio.load(page);

    // Extract contest ID and problem index from URL
    // URL formats:
    // - https://codeforces.com/problemset/problem/1234/A
    // - https://codeforces.com/contest/1234/problem/A
    // - https://codeforces.com/gym/123456/problem/A
    const urlParts = problemUrl.split('/');
    let contestId = '';
    let problemIndex = '';

    if (problemUrl.includes('/problemset/problem/')) {
        contestId = urlParts[urlParts.indexOf('problem') + 1];
        problemIndex = urlParts[urlParts.indexOf('problem') + 2];
    } else if (
        problemUrl.includes('/contest/') ||
        problemUrl.includes('/gym/')
    ) {
        const contestPos = problemUrl.includes('/contest/')
            ? urlParts.indexOf('contest')
            : urlParts.indexOf('gym');
        contestId = urlParts[contestPos + 1];
        problemIndex = urlParts[urlParts.indexOf('problem') + 1];
    } else {
        throw new Error('Unsupported Codeforces URL format');
    }

    // Extract problem title
    const titleElement = $('.header > div:nth-child(1)');
    let title = '';
    if (titleElement.length) {
        title = titleElement.text().trim();
        if (title.startsWith(problemIndex + '.')) {
            title = title.substring(problemIndex.length + 1).trim();
        } else if (title.startsWith(problemIndex + '. ')) {
            title = title.substring(problemIndex.length + 2).trim();
        }
    }

    // Extract tags
    const tagElements = $('.tag-box');
    const allTags = tagElements.map((_, el) => $(el).text().trim()).get();

    // Extract difficulty and filter tags
    let difficulty = '';
    const tags = allTags.filter((tag) => {
        if (tag.startsWith('*')) {
            difficulty = `"${tag.substring(1)}"`;
            return false;
        }
        return true;
    });

    const currentCode = vscode.window.activeTextEditor?.document.getText();

    return {
        questionId: `${contestId} ${problemIndex}`,
        title,
        content: '',
        tags,
        difficulty,
        problemLink: problemUrl,
        currentCode,
        language: vscode.window.activeTextEditor?.document.languageId,
        timestamp: new Date().toISOString(),
        platform: 'codeforces',
    };
};

export const exportToObsidianCommand = async () => {
    const obsidianReceiverURL = vscode.workspace
        .getConfiguration('cph')
        .get('general.obsidianReceiverURL') as string;
    if (obsidianReceiverURL === undefined || obsidianReceiverURL === null) {
        vscode.window.showErrorMessage(
            'Obsidian receiver URL is not set. Please set it in the extension settings.',
        );
        return;
    }

    const srcPath = vscode.window.activeTextEditor?.document.fileName;
    if (!srcPath) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    const problem = getProblem(srcPath);
    if (!problem) {
        vscode.window.showErrorMessage('Failed to parse current code.');
        return;
    }

    exportToObsidian(problem);
};

export const exportToObsidian = async (problem: Problem) => {
    const obsidianReceiverURL = vscode.workspace
        .getConfiguration('cph')
        .get('general.obsidianReceiverURL') as string;

    if (obsidianReceiverURL === undefined || obsidianReceiverURL === null) {
        vscode.window.showErrorMessage(
            'Obsidian receiver URL is not set. Please set it in the extension settings.',
        );
        return;
    }

    const problemData = await getData(problem.url);

    fetch(obsidianReceiverURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(problemData),
    })
        .then(() => {
            vscode.window.showInformationMessage('Exported to Obsidian');
        })
        .catch((err) =>
            vscode.window.showErrorMessage(
                'Failed to export to Obsidian: ' + err,
            ),
        );
};
