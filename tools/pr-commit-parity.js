export async function fetchJsonFromUrl(url) {
  const fetchResponse = await fetch(url);
  return fetchResponse.json();
}

//regex expressions
const PULL_REQ_REQUIREMENTS_REGEX = /\*\*Pull\sRequest\sRequirements(.|\n)*/gim;
const FIXES_OR_DEPENDS_REGEX = /(Fixes|Depends)(.|\n)*/gim;
const SIGNED_OFF_REGEX = /(")*Signed-off-by:(.|\s)*/gim;
const HYPHEN_REGEX = /(-)+/gm;
const BACKTICK_REGEX = /`+/gm;
const SPACE_REGEX = / +/gm;
const COMMIT_TO_BE_REVIEWED_REGEX = /("#*\s*Commit\sto\sbe\sreviewed)/gim;
const WHITESPACES_HARDCODED_REGEX = /(\r\n|\n|\r|\\r|\\n)/gm;

const args = process.argv.slice(2);
const pullReqUrl = args[0];

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
      .replace(FIXES_OR_DEPENDS_REGEX, "")
      .replace(SPACE_REGEX, ""),
  );
});

let prBodyStriped = prBodyRaw
  .replace(PULL_REQ_REQUIREMENTS_REGEX, "")
  .replace(FIXES_OR_DEPENDS_REGEX, "")
  .replace(WHITESPACES_HARDCODED_REGEX, "")
  .replace(SIGNED_OFF_REGEX, "")
  .replace(HYPHEN_REGEX, "")
  .replace(BACKTICK_REGEX, "")
  .replace(COMMIT_TO_BE_REVIEWED_REGEX, "")
  .replace(SPACE_REGEX, "");

let PR_BODY_IN_COMMIT_MESSAGES = false;
for (let commitMessageListIndex in commitMessageList) {
  let commitMessage = commitMessageList[commitMessageListIndex];
  if (commitMessage == prBodyStriped) PR_BODY_IN_COMMIT_MESSAGES = true;
}

if (!PR_BODY_IN_COMMIT_MESSAGES) {
  console.error(
    "PR Body does not match any existing commit message\n" +
      "Please make sure that the PR Body matches to minimum one of the commit messages\n" +
      "Please refer the following PR for reference: https://github.com/hyperledger/cacti/pull/3338\n" +
      "And the commit message here: https://github.com/hyperledger/cacti/pull/3338/commits/47ebdec442d30fa48c8518b876c47c38097cf028\n",
  );
  process.exit(-1);
}
