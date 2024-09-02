import { stringSimilarity } from "string-similarity-js";

export async function fetchJsonFromUrl(url) {
  const fetchResponse = await fetch(url);
  return fetchResponse.json();
}

// regex expressions
const PULL_REQ_REQUIREMENTS_REGEX = /\*\*Pull\sRequest\sRequirements(.|\n)*/gim;
const FIXES_OR_DEPENDS_REGEX = /(Fixes|Depends)(.|\n)*/gim;
const SIGNED_OFF_REGEX = /(")*Signed-off-by:(.|\s)*/gim;
const COMMIT_TITLE_REGEX = /.*\n/m;
const HYPHEN_REGEX = /(-)+/gm;
const BACKTICK_REGEX = /`+/gm;
const COMMIT_TO_BE_REVIEWED_REGEX = /("#*\s*Commit\sto\sbe\sreviewed)/gim;
const WHITESPACES_HARDCODED_REGEX = /(\r\n|\\r)/gm;
const NEWLINE_HARDCODED_REGEX = /\\n/gm;

const args = process.argv.slice(2);

// The following 2 lines should be commented to test this script locally
const pullReqUrl = args[0];
const ACCEPTABLE_SIMILARITY_RATIO = parseFloat(args[1]);

// These following 2 lines should be un-commented to test this script locally
// const pullReqUrl = "https://api.github.com/repos/hyperledger/cactus/pulls/3338";
// const ACCEPTABLE_SIMILARITY_RATIO = 0.9;

const prMetadata = await fetchJsonFromUrl(pullReqUrl);
const prBodyRaw = JSON.stringify(prMetadata.body);

let commitMessageList = [];
const commitMessagesMetadata = await fetchJsonFromUrl(pullReqUrl + "/commits");

commitMessagesMetadata.forEach((commitMessageMetadata) => {
  commitMessageList.push(
    commitMessageMetadata["commit"]["message"]
      .replace(SIGNED_OFF_REGEX, "")
      .replace(HYPHEN_REGEX, "")
      .replace(BACKTICK_REGEX, "")
      .replace(WHITESPACES_HARDCODED_REGEX, "")
      .replace(FIXES_OR_DEPENDS_REGEX, ""),
  );
});

let prBodyStriped = prBodyRaw
  .replace(PULL_REQ_REQUIREMENTS_REGEX, "")
  .replace(FIXES_OR_DEPENDS_REGEX, "")
  .replace(WHITESPACES_HARDCODED_REGEX, "\n")
  .replace(SIGNED_OFF_REGEX, "")
  .replace(HYPHEN_REGEX, "")
  .replace(BACKTICK_REGEX, "")
  .replace(COMMIT_TO_BE_REVIEWED_REGEX, "")
  .replace(NEWLINE_HARDCODED_REGEX, "");

let PR_COMMIT_PARITY = false;
for (let commitMessageListIndex in commitMessageList) {
  let commitMessage = commitMessageList[commitMessageListIndex];
  if (
    stringSimilarity(commitMessage, prBodyStriped) >=
      ACCEPTABLE_SIMILARITY_RATIO ||
    stringSimilarity(
      commitMessage.replace(COMMIT_TITLE_REGEX, ""),
      prBodyStriped,
    ) >= ACCEPTABLE_SIMILARITY_RATIO
  )
    PR_COMMIT_PARITY = true;
}

if (!PR_COMMIT_PARITY) {
  console.error(
    "PR message and commit message are not similar. A general solution for this is to have PR message exactly same as the commit message\n" +
      "Please refer the following PR for reference: https://github.com/hyperledger/cacti/pull/3338\n" +
      "And the commit message here: https://github.com/hyperledger/cacti/pull/3338/commits/47ebdec442d30fa48c8518b876c47c38097cf028\n",
    "-----------------------------------------------\n\n",
    "Commit Message List (ignore extra white spaces and new lines)\n" +
      commitMessageList +
      "\n----------------------------------------------\nRelevant Pr Description (ignore extra white spaces and new lines)\n" +
      prBodyStriped,
  );
  process.exit(-1);
}
