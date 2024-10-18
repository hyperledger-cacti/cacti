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

const main = async () => {
  const markdownContent = readFileSync(MaintainersFile, "utf-8");

  const args = process.argv.slice(2);
  const pullReqUrl = args[0];
  const committerLogin = args[1];

  //Uncomment these lines and change it for local machine testing purposes:
  //const pullReqUrl = "https://api.github.com/repos/<username>/cactus/pulls/<number>";
  //const committerLogin = "<username>";

  const fetchJsonFromUrl = async (url) => {
    const fetchResponse = await fetch(url);
    return fetchResponse.json();
  };

  let commitMessageList = [];
  const commitMessagesMetadata = await fetchJsonFromUrl(
    pullReqUrl + "/commits",
  );

  commitMessagesMetadata.forEach((commitMessageMetadata) => {
    // get commit message body
    commitMessageList.push(commitMessageMetadata["commit"]["message"]);
  });

  // Check if skip-ci is found in commit message
  const checkSkipCI = () => {
    for (let commitMessageListIndex in commitMessageList) {
      let commitMessage = commitMessageList[commitMessageListIndex];
      if (commitMessage.includes(SKIP_CACTI)) {
        console.log("Skip requested in commit message.");
        return true;
      } else {
        console.log("No skip request found.");
      }
      return false;
    }
  };

  // Function to extract active maintainers
  const extractMaintainers = (maintainerMetaData) => {
    let match;
    const maintainers = [];
    while ((match = MAINTAINERS_REGEX.exec(maintainerMetaData)) !== null) {
      const github = match[2];
      maintainers.push(github);
    }
    return maintainers;
  };
  // Get the maintainers
  const activeMaintainers = extractMaintainers(markdownContent);
  activeMaintainers.forEach((maintainers) => {
    maintainers;
  });

  // Check if committer is a trusted maintainer
  const checkCommitterIsMaintainer = () => {
    if (activeMaintainers.includes(committerLogin)) {
      console.log("The author of this PR is an active maintainer.");
      return true;
    } else {
      console.log(
        "CI will not be skipped. \nThe author of this PR is not an active maintainer.\nPlease refer to https://github.com/hyperledger/cacti/blob/main/MAINTAINERS.md for the list of active maintainers.",
      );
      return false;
    }
  };

  // Main logic

  const shouldSkipCI = checkSkipCI();

  if (shouldSkipCI) {
    const isMaintainer = checkCommitterIsMaintainer();
    if (isMaintainer) {
      console.log(
        "Exit with an error code so as to pause the dependent workflows. CI skipped as per request.",
      );
      process.exit(1); // Exit successfully to skip CI
    }
  } else {
    console.log("No skip requested. Proceeding with CI.");
    process.exit(0); // Exit successfully to run CI
  }
};

// Run the main function
main();
