module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "footer-max-line-length": [1, "always", 102],
    "header-max-length": [2, "always", 80],
    "body-max-line-length": [2, "always", 102],
  },
  parserPreset: {
    parserOpts: {
      noteKeywords: ["\\[\\d+\\]"],
    },
  },
  ignores: [(commit) => /^chore\(dco\): DCO remediation commit/.test(commit)],
};
