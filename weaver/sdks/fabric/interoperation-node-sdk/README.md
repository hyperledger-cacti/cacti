<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# weaver-fabric-interop-sdk

Client library functions to augment or complement the Fabric-Node-SDK library

The near-term scope of this project is the development of library functions and a NodeJS-based API for exercising of those functions by a Fabric client application. The library can be imported by an application written in NodeJS the same way the `fabric-client` library is. Functions to be implemented within this library involve communication with relays and with remote Fabric networks for the purpose of running cross-network chaincode queries.

In the longer-term, we will add support for cross-network transaction invocations as well as event publish/subscribe.

Further down the line, we may add extra support, as required, for information exchange with remote networks running on DLT platforms other than Fabric.

# Prerequisites

Run `npm install`

then run `make build`.

or run `make build-local`, this will clone/copy the proto files and generate the javascript proto files

# Testing

Run `npm test`

# Documentation

Run `npm run docs` to generate docs. View docs via the generated html file. 

# Steps to Use
1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Now put this `.npmrc` file in your application in same level as package.json.
5) Now you can run `npm install @hyperledger-labs/weaver-fabric-interop-sdk` in your application directory to install the latest version.

# Steps to publish
1) Create a Personal Access Token from Github with write/read/delete access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Run `npm publish` to publish package to github packages.

**NOTE:** Always publish to your fork first, and only after testing it well, then 
after PR approval, publish it to `hyperledger-labs/weaver-dlt-interoperability`.
To publish to your fork, modify in `package.json`:
```
...
"publishConfig": {
  "registry": "https://npm.pkg.github.com/<your-git-name>"
}
```

NOTE:- Github Packages won't allow you to update the package if same version exists,
you have to delete the package version (requires admin access) before publishing an update on the same package version.

