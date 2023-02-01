<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# fabric-cli 

A CLI for interacting with the fabric test-net and relays.

fabric-cli options: 

![cli options](./cli-options.png)

Example: 

![example](./example-gif.gif)



--help can be called on every command and provides examples and usage. 

More documentation can be found [here](docs/commands.md)

## Installing with npm

Set up `.npmrc` by following steps:
1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Now put this `.npmrc` file in your application in same level as package.json. Be careful not to replace anything

then run `npm install -g @res-dlt-interop/fabric-cli`

NOTE: If installing this way it is required to set up the env through the cli using either `fabric-cli env set <key> <value>` or `fabric-cli env set-file <file-path>`. Refer to the .env.template to determine what values are needed. 


## Pre-req


NOTE: If you are using a linux system make sure that `lib64` is installed

Tested on Node v10.16.3 requires Node >= 10.15.3 < 13.0

Set up `.env` by copying across the `.env.template` and updating the values

Set up `.npmrc` by following steps:
1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `.npmrc.template` as `.npmrc`.
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token.
4) Now put this `.npmrc` file in your application in same level as package.json. Be careful not to replace anything

Have `yarn` installed and have Node >= 10.15.3 < 16.0

Run `yarn` to install dependencies. 

## Usage

`cd fabric-cli`

and

`yarn link`

Then run 

`$ fabric-cli`


## Example Invoke 

`$ fabric-cli chaincode invoke mychannel simplestate invoke create '["test", "teststate"]'`

NOTE: --help flag can be provided to most commands to show examples and usage. 


# License

MIT - see LICENSE

