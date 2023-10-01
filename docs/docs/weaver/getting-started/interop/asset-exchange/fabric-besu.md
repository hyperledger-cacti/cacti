---
id: fabric-besu
title: "Asset Exchange: Fabric with Besu"
sidebar_label: Fabric with Besu
pagination_label: Fabric with Besu
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

We will demonstrate asset exchange of a bond in Fabric `network1` with `10 BobERC20` tokens on Besu `network2`.
For Fabric commands, run from `weaver/samples/fabric/fabric-cli` folder, and for Besu commands, run from `weaver/samples/besu/besu-cli` folder, in your clone of the Cacti repository. Here `Alice` and `Bob` in Fabric `network1` correspond to account `1` and account `2` in Besu `network2` respectively. Following are the step-by-step asset exchange process:

| Notes |
|:------|
| The hash used in following steps can be replaced by any valid `SHA256` hash. |

- From `fabric-cli`, generate secret-hash pair using following command (prints hash in base64):
  ```
  ./bin/fabric-cli hash --hash_fn=SHA256 secrettext
  ```
- Run the following to verify the status of the bond assets owned by `alice` and `bob` in the Fabric network `network1` from `weaver/samples/fabric/fabric-cli` folder:
 ```bash
 ./scripts/getAssetStatus.sh
 ```
- Run the following in `besu-cli`, to verify the status of the assets owned by `Alice` and `Bob` in the Besu network `network2`:
  ```bash
  ./bin/besu-cli asset get-balance --network=network2 --account=1
  ./bin/besu-cli asset get-balance --network=network2 --account=2
  ```
- Run the following to trigger `alice` locking `bond01:a03` for `bob` in `network1` for 60 mins:
  ```bash
  ./bin/fabric-cli asset exchange lock --timeout-duration=3600 --locker=alice --recipient=bob --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --target-network=network1 --param=bond01:a03
  ```
- Run the following to verify `alice`'s lock:
  ```bash
  ./bin/fabric-cli asset exchange is-locked --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
  ```
- Run the following to trigger `bob` locking `10` units of `BobERC20` tokens for `alice` in `network2` for 30 mins:
  ```bash
  ./bin/besu-cli asset lock --network=network2 --sender_account=2 --recipient_account=1 --amount=10 --timeout=1800 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
  ```
  Note the `contract-id` printed as output in above command. The output line containing `contract-id` (text in base64 after `Lock contract ID:`) would like this:
  ```bash
  Lock contract ID: 48f59da2ac632117bf79b4aa986f5ece8a2439dc143d576965c17bc8275b0925
  ```
  Let's refer it `<contract-id-2>` for this demonstration.

- Run the following to verify `bob`'s lock:
  ```bash
  ./bin/besu-cli asset is-locked --network=network2 --lock_contract_id=<contract-id-2>
  ```
- Run the following to trigger `alice`'s claim for `10` units of `BobERC20` tokens locked by `bob` in `network2`:
  ```bash
  ./bin/besu-cli asset claim --network=network2 --recipient_account=1 --preimage=secrettext --lock_contract_id=<contract-id-2>
  ```
- Run the following to trigger `bob`'s claim for `bond01:a03` locked by `alice` in `network1`:
  ```bash
  ./bin/fabric-cli asset exchange claim --recipient=bob --locker=alice --target-network=network1 --param=bond01:a03 --secret=secrettext
  ```
- Run the following to verify the status of the bond assets owned by `alice` and `bob` in the Fabric network `network1` from `weaver/samples/fabric/fabric-cli` folder:
   ```bash
   ./scripts/getAssetStatus.sh
   ```
- Run the following in `besu-cli`, to verify the status of the assets owned by `Alice` and `Bob` in the Besu network `network2`:
  ```bash
  ./bin/besu-cli asset get-balance --network=network2 --account=1
  ./bin/besu-cli asset get-balance --network=network2 --account=2
  ```

The above steps complete a successful asset exchange between Fabric and Corda networks. 
In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

- If `alice` wants to unlock the bond asset, run the following to trigger `alice`'s re-claim for `bond01:a03` locked in `network1`:
  ```bash
  ./bin/fabric-cli asset exchange unlock --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
  ```
- If `bob` wants to unlock the token asset, run the following to trigger `bob`'s re-claim for `50 BobERC20` tokens locked in `network2`:
  ```bash
  ./bin/besu-cli asset unlock --network=network2 --lock_contract_id=<contract-id-2> --sender_account=2
  ```
