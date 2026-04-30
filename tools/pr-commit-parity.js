const FETCH_TIMEOUT_MS = 10000; // 10 seconds

// Levenshtein Distance string metric is used for calculating
// string similarity which changes from 0 to 1,
// for 1 being exactly the same
function levenshteinDistance(str1, str2) {
  str1 = String(str1 ?? "");
  str2 = String(str2 ?? "");

  const len1 = str1.length;
  const len2 = str2.length;

  // Early exits
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  if (str1 === str2) return 0;

  // Use only one row instead of full matrix
  const dp = new Array(len2 + 1);
  for (let j = 0; j <= len2; j++) {
    dp[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    let prevDiagonal = dp[0];
    let prevColumn = i;
    dp[0] = i;

    for (let j = 1; j <= len2; j++) {
      const temp = dp[j];
      if (str1[i - 1] === str2[j - 1]) {
        dp[j] = prevDiagonal;
      } else {
        dp[j] = Math.min(dp[j] + 1, prevColumn + 1, prevDiagonal + 1);
      }
      prevDiagonal = temp;
      prevColumn = dp[j];
    }
  }

  return dp[len2];
}

function stringSimilarity(str1, str2) {
  str1 = String(str1 ?? "");
  str2 = String(str2 ?? "");

  const maxLen = Math.max(str1.length, str2.length);

  if (maxLen === 0) {
    return 1; // Both strings are empty
  }

  const distance = levenshteinDistance(str1, str2);
  const similarity = (maxLen - distance) / maxLen;

  return similarity;
}

export async function fetchJsonFromUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const fetchResponse = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text().catch(() => "");
      throw new Error(
        `Failed to fetch ${url}: ${fetchResponse.status} ${fetchResponse.statusText}${
          errorText ? ` - ${errorText.slice(0, 200)}` : ""
        }`,
      );
    }

    try {
      return await fetchResponse.json();
    } catch (error) {
      throw new Error(
        `Failed to parse JSON from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Fetch to ${url} timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

// regex expressions
const PULL_REQ_REQUIREMENTS_REGEX = /\*\*Pull\sRequest\sRequirements[\s\S]*/im;
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

if (
  !pullReqUrl ||
  typeof ACCEPTABLE_SIMILARITY_RATIO !== "number" ||
  ACCEPTABLE_SIMILARITY_RATIO < 0 ||
  ACCEPTABLE_SIMILARITY_RATIO > 1
) {
  console.error(
    "Usage: node pr-commit-parity.js <pullReqUrl> <acceptableSimilarityRatio>",
  );
  console.error(
    "Error: acceptableSimilarityRatio must be a number between 0 and 1 (inclusive).",
  );
  process.exit(1);
}

const prMetadata = await fetchJsonFromUrl(pullReqUrl);
const prTitle = String(prMetadata?.title ?? "");
const prBodyRaw = String(prMetadata?.body ?? "");

let commitMessageList = [];
const commitMessagesMetadata = await fetchJsonFromUrl(`${pullReqUrl}/commits`);

if (!Array.isArray(commitMessagesMetadata)) {
  throw new Error("Unexpected response shape from commits API");
}

commitMessagesMetadata.forEach((commitMessageMetadata) => {
  const commitMessage = String(commitMessageMetadata?.commit?.message ?? "");
  commitMessageList.push(
    commitMessage
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

for (const commitMessage of commitMessageList) {
  const commitMessageSubject =
    commitMessage.match(COMMIT_TITLE_REGEX)?.[0] ?? "";

  /*
   *  This condition checks for (A && (B || C)) is true, where,
   *  A) pr title is similar to the commit subject
   *  B) pr body is similar to the entire commit message
   *  C) pr body is similar to the commit message excluding commit subject
   */
  const titleSimilarity = stringSimilarity(commitMessageSubject, prTitle);
  const bodySimilarity = stringSimilarity(commitMessage, prBodyStriped);
  const bodyWithoutSubjectSimilarity = stringSimilarity(
    commitMessage.replace(COMMIT_TITLE_REGEX, ""),
    prBodyStriped,
  );

  if (
    titleSimilarity >= ACCEPTABLE_SIMILARITY_RATIO &&
    (bodySimilarity >= ACCEPTABLE_SIMILARITY_RATIO ||
      bodyWithoutSubjectSimilarity >= ACCEPTABLE_SIMILARITY_RATIO)
  ) {
    PR_COMMIT_PARITY = true;
    break;
  }

  /*
   *  This condition checks for (A && B) is true, where,
   *  A) pr title is similar to the commit subject
   *  B) pr body is empty (in case of releases)
   */
  if (titleSimilarity >= ACCEPTABLE_SIMILARITY_RATIO && prBodyStriped === "") {
    PR_COMMIT_PARITY = true;
    break;
  }
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
  process.exit(1);
}
