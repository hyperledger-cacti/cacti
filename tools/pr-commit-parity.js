// Levenshtein Distance string metric is used for calculating
// string similarity which changes from 0 to 1,
// for 1 being exactly the same
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return dp[len1][len2];
}

function stringSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);

  if (maxLen === 0) {
    return 100; // Both strings are empty
  }

  const distance = levenshteinDistance(str1, str2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return parseFloat(similarity.toFixed(2) / 100);
}

export async function fetchJsonFromUrl(url) {
  const fetchResponse = await fetch(url);
  return fetchResponse.json();
}

// regex expressions
const PULL_REQ_REQUIREMENTS_REGEX = /\*\*Pull\sRequest\sRequirements(.|\n)*/gim;
const SIGNED_OFF_REGEX = /(")*Signed-off-by:(.|\s)*/gim;
const COMMIT_TITLE_REGEX = /^.*$/m;
const BACKTICK_REGEX = /`+/gm;
const COMMIT_TO_BE_REVIEWED_REGEX = /("#*\s*Commit\sto\sbe\sreviewed)/gim;
const HYPERLEDGER_REFERENCE_REGEX = /hyperledger#/gm;
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
      .replace(BACKTICK_REGEX, "")
      .replace(HYPERLEDGER_REFERENCE_REGEX, "#")
      .replace(WHITESPACES_HARDCODED_REGEX, "")
      .trim(),
  );
});

let prBodyStriped = prBodyRaw
  .replace(PULL_REQ_REQUIREMENTS_REGEX, "")
  .replace(WHITESPACES_HARDCODED_REGEX, "\n")
  .replace(SIGNED_OFF_REGEX, "")
  .replace(BACKTICK_REGEX, "")
  .replace(HYPERLEDGER_REFERENCE_REGEX, "#")
  .replace(COMMIT_TO_BE_REVIEWED_REGEX, "")
  .replace(NEWLINE_HARDCODED_REGEX, "")
  .trim();

let PR_COMMIT_PARITY = false;
for (let commitMessageListIndex in commitMessageList) {
  let commitMessage = commitMessageList[commitMessageListIndex];
  let commitMessageSubject = commitMessage.match(COMMIT_TITLE_REGEX)[0];
  /*
   *  This condition checks for (A && (B || C)) is true, where,
   *  A) pr title is similar to the commit subject
   *  B) pr body is similar to the entire commit message
   *  C) pr body is similar to the commit message excluding commit subject
   */
  if (
    stringSimilarity(commitMessageSubject, prMetadata.title) >=
      ACCEPTABLE_SIMILARITY_RATIO &&
    (stringSimilarity(commitMessage, prBodyStriped) >=
      ACCEPTABLE_SIMILARITY_RATIO ||
      stringSimilarity(
        commitMessage.replace(COMMIT_TITLE_REGEX, ""),
        prBodyStriped,
      ) >= ACCEPTABLE_SIMILARITY_RATIO)
  )
    PR_COMMIT_PARITY = true;
  /*
   *  This condition checks for (A && B) is true, where,
   *  A) pr title is similar to the commit subject
   *  B) pr body is empty (in case of releases)
   */
  if (
    stringSimilarity(commitMessageSubject, prMetadata.title) >=
      ACCEPTABLE_SIMILARITY_RATIO &&
    prBodyStriped === ""
  )
    PR_COMMIT_PARITY = true;
}

if (!PR_COMMIT_PARITY) {
  console.error(
    "PR message and commit message are not similar. A general solution for this is to have PR message exactly same as the commit message\n" +
      "Please refer the following PR for reference: https://github.com/hyperledger-cacti/cacti/pull/3338\n" +
      "And the commit message here: https://github.com/hyperledger-cacti/cacti/pull/3338/commits/47ebdec442d30fa48c8518b876c47c38097cf028\n",
    "-----------------------------------------------\n\n",
    "Commit Message List (ignore extra white spaces and new lines)\n" +
      commitMessageList +
      "\n----------------------------------------------\nRelevant Pr Description (ignore extra white spaces and new lines)\n" +
      prBodyStriped,
  );
  process.exit(-1);
}
