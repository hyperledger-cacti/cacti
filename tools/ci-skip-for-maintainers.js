import { readFileSync } from "fs";

//A new tag exclusively for MAINTAINERS that allows skipping the CI check
const SKIP_CACTI = "skip-cacti-ci";
const MaintainersFile = "MAINTAINERS.md";
//regular expression to get the maintainers in MAINTAINERS.md
const NAMES_REGEX = /\|\s*([A-Za-z\s]+)\s*/;
const LINKS_REGEX = /\|\s*\[([^\]]+)\]\[[^\]]+\]\s*/;
const TAGS_REGEX = /\|\s*([A-Za-z0-9_-]+|-)*\s*/;
const MAINTAINERS_REGEX = new RegExp(
  NAMES_REGEX.source + LINKS_REGEX.source + TAGS_REGEX.source,
  "g",
);

const fetchJsonFromUrl = async (url, fetchFn) => {
  const fetchResponse = await fetchFn(url);
  return fetchResponse.json();
};

export const extractMaintainers = (maintainerMetaData) => {
  let match;
  const maintainers = [];
  while ((match = MAINTAINERS_REGEX.exec(maintainerMetaData)) !== null) {
    const github = match[2];
    maintainers.push(github);
  }
  return maintainers;
};

export const checkSkipCI = (commitMessageList, logger = console) => {
  for (const commitMessage of commitMessageList) {
    if (
      typeof commitMessage === "string" &&
      commitMessage.includes(SKIP_CACTI)
    ) {
      logger.log("Skip requested in commit message.");
      return true;
    }
  }

  logger.log("No skip request found.");
  return false;
};

export const getCommitMessageList = async (
  pullReqUrl,
  { fetchFn = fetch, logger = console } = {},
) => {
  if (!pullReqUrl) {
    logger.log("No pull request URL detected. Proceeding with CI.");
    return [];
  }

  const commitMessagesMetadata = await fetchJsonFromUrl(
    `${pullReqUrl}/commits`,
    fetchFn,
  );

  if (!Array.isArray(commitMessagesMetadata)) {
    logger.warn("Commit metadata payload is not a list. Proceeding with CI.");
    return [];
  }

  return commitMessagesMetadata
    .map((commitMessageMetadata) => commitMessageMetadata?.commit?.message)
    .filter((commitMessage) => typeof commitMessage === "string");
};

export const run = async ({
  args = process.argv.slice(2),
  fetchFn = fetch,
  readFile = readFileSync,
  logger = console,
  exit = process.exit,
  maintainersFilePath = MaintainersFile,
} = {}) => {
  const markdownContent = readFile(maintainersFilePath, "utf-8");

  const pullReqUrl = args[0];
  const committerLogin = args[1];

  //Uncomment these lines and change it for local machine testing purposes:
  //const pullReqUrl = "https://api.github.com/repos/<username>/cactus/pulls/<number>";
  //const committerLogin = "<username>";

  const commitMessageList = await getCommitMessageList(pullReqUrl, {
    fetchFn,
    logger,
  });

  // Main logic
  const shouldSkipCI = checkSkipCI(commitMessageList, logger);

  if (!shouldSkipCI) {
    logger.log("No skip requested. Proceeding with CI.");
    exit(0); // Exit successfully to run CI
    return 0;
  }

  const activeMaintainers = extractMaintainers(markdownContent);

  if (!committerLogin) {
    logger.log(
      "CI will not be skipped. Missing committer login in invocation context.",
    );
    exit(0);
    return 0;
  }

  if (activeMaintainers.includes(committerLogin)) {
    logger.log("The author of this PR is an active maintainer.");
    logger.log(
      "Exit with an error code so as to pause the dependent workflows. CI skipped as per request.",
    );
    exit(1); // Exit with an error code to skip CI
    return 1;
  }

  logger.log(
    "CI will not be skipped. \nThe author of this PR is not an active maintainer.\nPlease refer to https://github.com/hyperledger/cacti/blob/main/MAINTAINERS.md for the list of active maintainers.",
  );
  exit(0);
  return 0;
};

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
  run().catch((error) => {
    console.error("check ci skip crashed:", error);
    process.exit(1);
  });
}
