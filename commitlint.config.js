module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "footer-max-line-length": [1, "always", 80],
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 80]
  },
  parserPreset: {
    parserOpts: {
      noteKeywords: ["\\[\\d+\\]"],
    },
  },
  ignores: [(commit) => /^chore\(dco\): DCO remediation commit/.test(commit)],
};
