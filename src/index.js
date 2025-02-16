import { Octokit } from "octokit";
import dotenv from "dotenv";
import { writeFile } from "fs/promises";

dotenv.config();

const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
  console.error("Error: Required environment variables are not set.");
  console.error(
    "Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in your .env file."
  );
  process.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const getIssues = async () => {
  try {
    const comments = await octokit.paginate(
      "GET /repos/{owner}/{repo}/issues/comments",
      {
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        state: "all",
        per_page: 100,
      }
    );
    return comments.reduce((prev, cur) => {
      const sameIssueIndex = prev.findIndex(
        ({ issue_url }) => issue_url === cur.issue_url
      );
      if (sameIssueIndex >= 0) {
        prev[sameIssueIndex].comments.push(cur.body);
      } else {
        prev.push({
          issue_url: cur.issue_url,
          comments: [cur.body],
        });
      }
      return prev;
    }, []);
  } catch (error) {
    console.error("Error fetching issues:", error.message);
    if (error.response) {
      console.error("Error details:", error.response.data);
    }
    process.exit(1);
  }
};

const exportIssuesToJsonFile = async (formattedIssues) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `exports/issues-${timestamp}.json`;

  await writeFile(filename, JSON.stringify(formattedIssues, null, 2));
  console.log(
    `Successfully exported ${formattedIssues.length} issues to ${filename}`
  );
};

getIssues().then(async (issues) => {
  await exportIssuesToJsonFile(issues);
});
