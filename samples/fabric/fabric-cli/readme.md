<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# fabric-cli

A CLI for interacting with the Fabric test-net and relays. Made using [gluegun.js](https://infinitered.github.io/gluegun/#/)

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
    │   └── wallet-${networkname}  # Wallets used by the CLI to connect with the Fabric networks.
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

Below are the steps to exercise asset exchange using the `fabric-cli` tool.
1. Spin up both `network1` and `network2` with interoperation chaincode installed along with the `simpleasset` application by navigating to the `tests/network-setups/fabric/dev` folder and running either
   ```bash
   make start-interop CHAINCODE_NAME=simpleasset
   ```
   or
   ```bash
   make start-interop-local CHAINCODE_NAME=simpleasset
   ```
   depending on whether you are using pre-built Github packages or using local builds from this clone of the repository.
2. Go to the Fabric Client `fabric-cli` directory (the folder `samples/fabric/fabric-cli` if you want to exercise the CLI using `node`, or the folder `samples/fabric/go-cli` if you want to exercise the CLI using `go`).
3. If a `config.json` (or equivalent, as set in the `CONFIG_PATH` property in `.env`) doesn't exist, create one by making a copy of `config.template.json`. In the `config.json`, set the `chaincode` field in both the `network1` and `network2` sections to `simpleasset`.
4. Run the below script that performs: setting the enviroment, adding the users `Alice` and `Bob` to both the networks and finally adding the non-fungible (i.e., bonds) and fungible (i.e., tokens) assets into the accounts of `Alice` and `Bob`.
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
- Spin up the networks by running the below command (equivalent of step 1 above)
   ```bash
   make start CHAINCODE_NAME=simpleassetandinterop
   ```
   or
   ```bash
   make start-interop-local CHAINCODE_NAME=simpleassetandinterop
   ```
   depending on whether you are using pre-built Github packages or using local builds from this clone of the repository.
- Replace `simpleasset` with `simpleassetandinterop` in the `config.json` file used to populate the `.env` file that is part of the script `initAsset.sh` (equivalent of step 2 above)
- Replace `simpleasset` with `simpleassetandinterop` in the script `getAssetStatus.sh` (equivalent of step 3 above)

You can repeat the above experiment with the `simpleassettransfer` chaincode as well, though this chaincode contains augmentations that serve to demonstrate asset transfers (see below).


## Asset Exchange

Below are the steps to exercise asset transfers from `network1` to `network2` using the `fabric-cli` tool.
1. Spin up both `network1` and `network2` with interoperation chaincode installed along with the `simpleassettransfer` application by navigating to the `tests/network-setups/fabric/dev` folder and running either
   ```bash
   make start-interop CHAINCODE_NAME=simpleassettransfer
   ```
   or
   ```bash
   make start-interop-local CHAINCODE_NAME=simpleassettransfer
   ```
   depending on whether you are using pre-built Github packages or using local builds from this clone of the repository.
2. Start relays and Fabric drivers for both `network1` and `network2`.
3. Go to the Fabric Client `fabric-cli` directory (`samples/fabric/fabric-cli`).
4. Create a `config.json` (you can pick a different name, but make sure you set the right reference in the `CONFIG_PATH` property in `.env`) by copying `config.template.json` and set certain properties as shown below (you can leave the others unchanged):
   ```json
   {
      "network1": {
         ...
         "chaincode": "simpleasset",
         ...
      },
      "network2": {
         ...
         "chaincode": "simpleasset",
         "aclPolicyPrincipalType": "ca"
      }
   }
   ```
4. Set the `DEFAULT_APPLICATION_CHAINCODE` property in the `.env` to `simpleassettransfer`.
5. Set environment variables and network configuration properties as follows:
   ```bash
   ./bin/fabric-cli env set-file ./.env
   ./bin/fabric-cli config set-file ./config.json
   ```
6. Create default access control and verification policies and record them in the two networks' ledgers as follows:
   ```bash
   ./bin/fabric-cli configure create all --local-network=network1
   ./bin/fabric-cli configure create all --local-network=network2
   ./bin/fabric-cli configure network --local-network=network1
   ./bin/fabric-cli configure network --local-network=network2
   ```
7. Initialize bond and token asset states and ownerships on the `network1` ledger as follows:
   ```bash
   ./scripts/initAssetsForTransfer.sh
   ```
   This step will also create a user `alice` in `network1` and a user `bob` in `network2`.

**The following sequence of operations will illustrate transfers and recoveries of a bond (non-fungible) asset.**

8. Verify that `alice` owns bonds with ids `a03` and `a04` as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network1
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network1
   ```
   You should see a JSON structure corresponding to the bond being logged on the console in each case.
9. Get `alice` in `network1` to pledge bond `a03` to `bob` in `network2` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=bond --ref=a03 --data-file=src/data/assetsForTransfer.json
   ```
10. Get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./scripts/claimAsset.sh bond bond01 a03
   ```
11. Verify that `alice` in `network1` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network1
   ```
   You should see an error message like `Error: the asset a03 does not exist`.
12. Verify that `bob` in `network2` now owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network2
   ```
13. Now get `alice` in `network1` to pledge bond `a04` to `bob` in `network2` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=bond --ref=a04 --data-file=src/data/assetsForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
14. Now get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./scripts/claimAsset.sh bond bond01 a04
   ```
   This should fail as the pledge has already expired.
15. Now get `alice` in `network1` to reclaim the asset as follows:
   ```bash
   ./scripts/reclaimAsset.sh bond bond01 a04
   ```
16. Verify that `alice` in `network1` owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network1
   ```
17. Verify that `bob` in `network2` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network2
   ```
   You should see an error message like `Error: the asset a04 does not exist`.

**The following sequence of operations will illustrate transfers and recoveries of a bond (non-fungible) asset.**

18. Verify that `alice` in `network1` owns `10000` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
19. Verify that `bob` in `network2` owns no tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```
   You should see an error message like `Error: owner does not have a wallet`.
20. Get `alice` in `network1` to pledge 50 tokens to `bob` in `network2` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=token --units=50 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
21. Get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./scripts/claimAsset.sh token token1 <pledge-id> 50
   ```
22. Verify that `alice` in `network1` owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
23. Verify that `bob` in `network2` now owns `50` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```
24. Now get `alice` in `network1` to pledge 100 tokens to `bob` in `network2` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=token --units=100 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
25. Now get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./scripts/claimAsset.sh token token1 <pledge-id> 100
   ```
   This should fail as the pledge has already expired.
26. Now get `alice` in `network1` to reclaim these tokens as follows:
   ```bash
   ./scripts/reclaimAsset.sh token token1 <pledge-id>
   ```
27. Verify that `alice` in `network1` still owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
28. Verify that `bob` in `network2` still owns only `50` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```


## NOTE

Due to how Fabric works and the CA works once a wallet has been created with identities in the CA you cannot create new wallet without fist revoking the original credentials. This can have some issues if you have deleted a wallet and are trying to recreate one.


# License

MIT - see LICENSE
