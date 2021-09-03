<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# fabric-cli

A CLI for interacting with the fabric test-net and relays. Made using [gluegun.js](https://infinitered.github.io/gluegun/#/)

fabric-cli options:

![cli options](./cli-options.png)

--help can be called on every command and provides examples and usage.

More documentation can be found [here](docs/commands.md)

# Folder Structure
    .
    ├── build                      # Compiled files
    ├── docs                       # Documentation files
    ├── src                        # Source files
    │   ├── commands               # Commands for the cli. Subcommands are in named folders
    │   ├── data                   # Data used across the commands, includes credentials for other networks and basic data to initialise the network with
    │    ├── helpers                # Helper functions that are used across the commands
    │   └── wallet-${networkname}  # Wallets used by the CLI to connect with the fabric networks.
    └── ...

Another naming convention made is inside the commands folder files suffixed with "`-helper`" are used to for the `--help` options for each command.

# Installation

The tool can be installed via npm or manually. If no development is required it is recommended to install via npm.

## Installing with npm

Set up `.npmrc` by copying across the `.npmrc.template` and updating the values. View [Setup access token for weaver-fabric-interop-sdk for the detailed process](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/samples/fabric/fabric-cli/readme.md#setup-access-token-for-fabric-interop-sdk)

Add contents of the `.npmrc` to the `.npmrc` located at `~/.npmrc`, be careful not to replace anything

then run `npm install -g @hyperledger-labs/weaver-fabric-cli`

NOTE: If installing this way it is required to set up the env and config through the cli using either `fabric-cli env set <key> <value>` or `fabric-cli env set-file <file-path>`. Refer to the `.env.template` and `config.json `to determine what values are needed.

## Installing manually

### Pre-req


NOTE: If you are using a linux system make sure that `lib64` is installed

Tested on Node v11.14.0 to v16.0.0; requires Node >= 11.14.0 <= 16.0.0

Set up `.env` by copying across the `.env.template` and updating the values

Set up `config.json` by adding the connection profile and relay port for each network. (Can be set with env variable `CONFIG_PATH`)

(Editing of the env and config can be done via the CLI with the `fabric-cli env set` and `fabric-cli config set` commands)

Set up `.npmrc` by copying across the `.npmrc.template` and updating the values. View [Setup access token for weaver-fabric-interop-sdk for the detailed process](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/samples/fabric/fabric-cli/readme.md#setup-access-token-for-fabric-interop-sdk)

Have `yarn` installed and have Node >= 11.14.0 <= 16.0.0

Run `yarn` to install dependencies.

### Development

`cd fabric-cli`

and

`yarn link`

Then run

`$ fabric-cli`

## Docker

Set up `.npmrc` by copying across the `.npmrc.template` and updating the values. View [Setup access token for weaver-fabric-interop-sdk for the detailed process](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/samples/fabric/fabric-cli/readme.md#setup-access-token-for-fabric-interop-sdk)

Run `make build-image` to build fabric-cli docker image.

Then run `docker-compose up -d` to start fabric-cli container.

Then run `docker exec -it fabric-cli bash`, to open interactive shell for fabric-cli, where regular fabric-cli calls can be made.

Setting env is not required inside docker, as env variables are already declared, so next steps would be:
* `fabric-cli config set-file $CONFG_PATH`
* `fabric-cli configure all network1 network2`.


## Example Invoke

To record a key `test` with the value `teststate` via the `simplestate` contract deployed on the `mychannel` channel in `network1`, run:
```
$ fabric-cli chaincode invoke mychannel simplestate create '["test", "teststate"]'` --local-network=network1
```
To now query the value of the the `test` key, run:
```
$ fabric-cli chaincode query mychannel simplestate read '["test"]' --local-network=network1
```

NOTE: Use the `--help` flag with any command to view examples and usage.

## Publishing CLI

Run `npm publish`. Will need the github personal access token with write access, will error if same version is already published.

## Setup access token for weaver-fabric-interop-sdk

1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help. \
2) Create a copy of `.npmrc.template` as `.npmrc`. \
3) Replace <personal-access-token> in copied `.npmrc` file with your personal access token. \
4) Run npm install to check if it is working before testing/deployment.

## Environment Variables
- `DEFAULT_CHANNEL` (OPTIONAL) The default channel used by the CLI when invoking chaincode on a network.
- `DEFAULT_CHAINCODE`(OPTIONAL) The default chaincode id used by the CLI when invoking chaincode on a network.
- `MEMBER_CREDENTIAL_FOLDER`(OPTIONAL) The folder where network configurations will be stored and pulled from when generating network config and loading the chaincode.
- `CONFIG_PATH`(OPTIONAL) Path to the configuration file used by the CLI when creating network credentials and communicating with the relays.

## Configuration file (required)

The configuration file is used by the CLI when generating credentials to communicate with the network as well as the endpoint used to communicate with the relay. Each network can specify a unique relay and connection profile.

Example config:
```
{
  "network1": {
    "connProfilePath": "",
    "relayEndpoint": "",
    "mspId": "",
    "channelName": "",
    "chaincode": ""
  },
  "network2": {
    "connProfilePath": "",
    "relayEndpoint": "",
    "mspId": "",
    "channelName": "",
    "chaincode": ""
  }
}
```

## Asset Exchange

Below are the steps to exercise asset exchange using the CLI `fabric-cli`.
1. Spin up both `network1` and `network2` with interoperation chaincode installed along with the `simpleasset` application, by running
   ```bash
   make start-interop CHAINCODE_NAME=simpleasset
   ```
2. Go to the Fabric Client `fabric-cli` directory (the folder `samples/fabric/fabric-cli` if you want to exercise the CLI using `node`, or the folder `samples/fabric/go-cli` if you want to exercise the CLI using `go`) and run the below script that performs: setting the enviroment, adding the users `Alice` and `Bob` to both the networks and finally adding the non-fungible (i.e., bonds) and fungible (i.e., tokens) assets into the accounts of `Alice` and `Bob`.
   ```bash
   sh scripts/initAsset.sh
   ```
3. Check the status of the assets owned by `Alice` and `Bob` in the the networks `network1` and `network2`, by running
   ```bash
   sh scripts/getAssetStatus.sh
   ```
4. Initiate exchange of bond asset `bond01:a04` of `Bob` in `network1` with token assets `token1:100` of `Alice` in `network2`, by running
   ```
   ./bin/fabric-cli asset exchange-all --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 bob:bond01:a04:alice:token1:100
   ```
   Repeat the step 3 to observe the change in the ownership of assets as a result of the `asset echange` exercise.

5. The same asset exchange experiment in the above step, can be carried out by manually triggering below commands in serial order (with the help of `fabric-cli asset exchange-step` CLI commands):
   ```
   ./bin/fabric-cli asset exchange-step --step=1 --timeout-duration=3600 --locker=alice --recipient=bob --secret=<hash-pre-image> --target-network=network1 --param=bond01:a03
   ./bin/fabric-cli asset exchange-step --step=2 --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
   ./bin/fabric-cli asset exchange-step --step=3 --timeout-duration=1800 --locker=bob --recipient=alice --hash=<hash-value> --target-network=network2 --param=token1:100
   ./bin/fabric-cli asset exchange-step --step=4 --locker=bob --recipient=alice --target-network=network2 --contract-id=<contract-id>
   ./bin/fabric-cli asset exchange-step --step=5 --recipient=alice --locker=bob --target-network=network2 --contract-id=<contract-id> --secret=<hash-pre-image>
   ./bin/fabric-cli asset exchange-step --step=6 --recipient=bob --locker=alice --target-network=network1 --param=bond01:a03 --secret=<hash-pre-image>
   ./bin/fabric-cli asset exchange-step --step=7 --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
   ./bin/fabric-cli asset exchange-step --step=8 --locker=bob --recipient=alice --target-network=network2 --contract-id=<contract-id>
   ```
 
 The `asset exchange` scenario is demonstrated above using an application chaincode `simpleasset` and the `interop` chaincode, where the application chaincode makes invocations into the `interop` chaincode when it needs to lock, claim, or reclaim/unlock assets. However, the same `asset exchange` scenario can be demonstrated with the help of just the application chaincode `simpleassetandinterop` which also includes the scripts to lock, claim, or reclaim/unlock assets. This requires the steps 1-5 to be exercised with minor modifications as indicated below:
- Spin up the networks by running the below command (update to step 1)
   ```bash
   make start CHAINCODE_NAME=simpleassetandinterop
   ```
- Replace `simpleasset` with `simpleassetandinterop` in the `config.json` file used to populate the `.env` file that is part of the script `initAsset.sh` (update to step 2)
- Replace `simpleasset` with `simpleassetandinterop` in the script `getAssetStatus.sh` (update to step 3)


## NOTE

Due to how fabric works and the CA works once a wallet has been created with identities in the CA you can not create new wallet without fist revoking the original credentials. This can have some issues if you have deleted a wallet and are trying to recreate one.


# License

MIT - see LICENSE
