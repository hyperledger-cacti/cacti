import assert from "node:assert/strict";
import test from "node:test";

import {
  checkSkipCI,
  getCommitMessageList,
  run,
} from "./ci-skip-for-maintainers.js";

test("getCommitMessageList: returns empty list without PR URL", async () => {
  let fetchCalled = false;

  const commitMessages = await getCommitMessageList(undefined, {
    fetchFn: async () => {
      fetchCalled = true;
      return { json: async () => [] };
    },
    logger: { log: () => undefined, warn: () => undefined },
  });

  assert.equal(fetchCalled, false);
  assert.deepEqual(commitMessages, []);
});

test("checkSkipCI: scans all commit messages before returning false", async () => {
  const shouldSkip = checkSkipCI([
    "feat: first commit",
    "chore(ci): skip-cacti-ci",
  ]);

  assert.equal(shouldSkip, true);
});

test("run: exits with zero code in non-PR context", async () => {
  let fetchCalled = false;
  let exitCode;

  const code = await run({
    args: [undefined, "petermetz"],
    fetchFn: async () => {
      fetchCalled = true;
      return { json: async () => [] };
    },
    readFile: () =>
      "| Name | Github | tags |\n| Alice | [petermetz][petermetz] | Maintainer |\n",
    logger: { log: () => undefined, warn: () => undefined },
    exit: (candidateCode) => {
      exitCode = candidateCode;
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(code, 0);
  assert.equal(exitCode, 0);
});
