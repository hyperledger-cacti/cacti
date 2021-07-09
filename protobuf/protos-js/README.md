# Compiled Protos for JS

## Steps to publish:

1) Create a Personal Access Token from Github with write/read/delete access to packages.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Run `npm publish` to publish package to github packages.

# Steps to Use
1) Create a Personal Access Token from Github with read access to packages.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Now put this `.npmrc` file in your application in same level as package.json.
5) Now you can run `npm install @hyperledger-labs/weaver-protos-js` in your application directory to install the latest version.
