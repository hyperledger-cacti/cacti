---
id: asset-exchange
title: Asset Exchange
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Below are the steps to exercise asset exchange using `fabric-cli`.
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
- Repeat the step 3 to observe the change in the ownership of assets as a result of the `asset echange` exercise.

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
 6. The `asset exchange` scenario is demonstrated above using an application chaincode `simpleasset` and the `interop` chaincode, where the application chaincode makes invocations into the `interop` chaincode when it needs to lock, claim, or reclaim/unlock assets. However, the same `asset exchange` scenario can be demonstrated with the help of just the application chaincode `simpleassetandinterop` which also includes the scripts to lock, claim, or reclaim/unlock assets. This requires the steps 1-5 to be exercised with minor modifications as indicated below:
 - Spin up the networks by running the below command (update to step 1)
 ```bash
 make start CHAINCODE_NAME=simpleassetandinterop
```
- Replace `simpleasset` with `simpleassetandinterop` in the `config.json` file used to populate the `.env` file that is part of the script `initAsset.sh` (update to step 2)
- Replace `simpleasset` with `simpleassetandinterop` in the script `getAssetStatus.sh` (update to step 3)
