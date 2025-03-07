import { readFileSync } from "fs";
import { execSync } from "child_process";
import fs from "fs";
// Constants
const SKIP_CACTI = "skip-cacti-ci";
const MaintainersFile = "MAINTAINERS.md";
const NAMES_REGEX = /\|\s*([A-Za-z\s]+)\s*/;
const LINKS_REGEX = /\|\s*\[([^\]]+)\]\[[^\]]+\]\s*/;
const TAGS_REGEX = /\|\s*([A-Za-z0-9_-]+|-)*\s*/;
const MAINTAINERS_REGEX = new RegExp(
  NAMES_REGEX.source + LINKS_REGEX.source + TAGS_REGEX.source,
  "g",
);

const getMaintainersFileContent = () => {
  try {
    return readFileSync(MaintainersFile, "utf-8");
  } catch (error) {
    console.error(`Error reading ${MaintainersFile}:`, error.message);
    process.exit(1);
  }
};

// Function to get the latest commit message author
const getCommitterAuthor = () => {
  return process.env.GITHUB_ACTOR || "unknown";
};

// Function to get the latest commit message
const getLatestCommitMessage = () => {
  const commitMsgBuffer = execSync("git log -1 --pretty=%B");
  const commitMsgString = commitMsgBuffer.toString();
  const commitMsgTrim = commitMsgString.trim();
  return commitMsgTrim;
};

// Function to check if SKIP_CACTI tag is in the commit message
const checkSkipCI = (commitMessage) => {
  if (commitMessage.includes(SKIP_CACTI)) {
    console.log("Skip requested in commit message.");
    return true;
  }
  console.log("No skip request found.");
  return false;
};

// Function to extract maintainers from the MAINTAINERS.md file content
const extractMaintainers = (maintainerMetaData) => {
  let match;
  const maintainers = [];
  while ((match = MAINTAINERS_REGEX.exec(maintainerMetaData)) !== null) {
    const github = match[2];
    maintainers.push(github);
  }
  return maintainers;
};

// Function to check if committer is an active maintainer
const checkCommitterIsMaintainer = (committerAuthor, activeMaintainers) => {
  if (activeMaintainers.includes(committerAuthor)) {
    console.log("The author of this PR is an active maintainer.");
    return true;
  }
  console.log(
    "CI will not be skipped. \nThe author of this PR is not an active maintainer.\nPlease refer to https://github.com/hyperledger/cacti/blob/main/MAINTAINERS.md for the list of active maintainers.",
  );
  return false;
};

// Main function to determine whether to skip CI or proceed
const main = async () => {
  const markdownContent = getMaintainersFileContent();
  const committerAuthor = getCommitterAuthor();
  const commitMessage = getLatestCommitMessage();
  const shouldSkipCI = checkSkipCI(commitMessage);
  const outputPath = process.env.GITHUB_OUTPUT;

  const activeMaintainers = extractMaintainers(markdownContent);
  const isMaintainer = checkCommitterIsMaintainer(
    committerAuthor,
    activeMaintainers,
  );
  // Final decision: skip if either shouldSkipCI or isMaintainer is true
  const shouldSkip = shouldSkipCI || isMaintainer;
  // Write only once to GITHUB_OUTPUT
  if (!outputPath) {
    console.error("GITHUB_OUTPUT is not defined. Exiting.");
    process.exit(1);
  }
  fs.appendFileSync(outputPath, `should_skip=${shouldSkip}\n`);

  if (shouldSkip) {
    console.log("CI skipped as per request. Exiting with code 0.");
    process.exit(0); // Normal exit
  } else {
    console.log("No skip requested. Proceeding with CI.");
    process.exit(0);
  }
};

// Run the main function
main();
