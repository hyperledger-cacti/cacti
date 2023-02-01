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

Set up `.npmrc` by copying across the `.npmrc.template` and updating the values. View [Setup Artifactory token for fabric-interop-sdk for the detailed process](https://github.ibm.com/dlt-interoperability/network-setups/tree/master/fabric/dev/scripts/fabric-cli#setup-artifactory-token-for-fabric-interop-sdk)

Add contents of the `.npmrc` to the `.npmrc` located at `~/.npmrc`, be careful not to replace anything

then run `npm install -g @res-dlt-interop/fabric-cli`

NOTE: If installing this way it is required to set up the env through the cli using either `fabric-cli env set <key> <value>` or `fabric-cli env set-file <file-path>`. Refer to the .env.template to determine what values are needed. 


## Pre-req


NOTE: If you are using a linux system make sure that `lib64` is installed

Tested on Node v10.16.3 requires Node >= 10.15.3 < 13.0

Set up `.env` by copying across the `.env.template` and updating the values

Set up `.npmrc` by copying across the `.npmrc.template` and updating the values. View [Setup Artifactory token for fabric-interop-sdk for the detailed process](https://github.ibm.com/dlt-interoperability/network-setups/tree/master/fabric/dev/scripts/fabric-cli#setup-artifactory-token-for-fabric-interop-sdk)

Have `yarn` installed and have Node >= 10.15.3 < 13.0

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


## Setup Artifactory token for fabric-interop-sdk

1) Go to IBM artifactory (https://na.artifactory.swg-devops.com/artifactory/)
2) Click on your email id on top right
3) Generate/Copy the API key from profile, let's say it is - "ThisIsMyAPIKey"
4) Run this command on your system - 
	 curl --header 'X-JFrog-Art-Api: ThisIsMyAPIKey' https://na.artifactory.swg-devops.com/artifactory/api/npm/auth
5) The above command will return you auth token along with auth settings and your email id from artifactory.
6) Create a .npmrc file in the backend folder (from where you want to run npm install)
7) Add this line to your .npmrc file,
	 @res-dlt-interop:registry=https://na.artifactory.swg-devops.com/artifactory/api/npm/res-dlt-interop-npm-local/
8) Add the output of curl to that file.
9) Final .npmrc should look like this - 
   "@res-dlt-interop:registry=https://na.artifactory.swg-devops.com/artifactory/api/npm/res-dlt-interop-npm-local/
    _auth = <Auth-token>
    always-auth = true
    email = user@email.com"
10) Run npm install to check if artifactory connection is working before testing/deployment.




# License

MIT - see LICENSE

