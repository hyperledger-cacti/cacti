---
id: fabric-fabric
title: "Asset Exchange: Fabric with Fabric"
sidebar_label: Fabric with Fabric
pagination_label: Fabric with Fabric
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

One Fabric network transfers a bond from Alice to Bob in exchange for a transfer of tokens from Bob to Alice in the other network
Ensure that one of the following chaincodes have been deployed in both networks:

* `simpleasset`
* `simpleassetandinterop`
* `simpleassettransfer`

Run the following steps:

| Notes |
|:------|
| The hash used in following steps can be replaced by any valid `SHA256` hash. |

1. Navigate to the `weaver/samples/fabric/fabric-cli` (for the Node.js version) or the `weaver/samples/fabric/go-cli` (for the Golang version) folder in your clone of the Cacti repository.
2. Run the following to verify the status of the assets owned by `alice` and `bob` in the two networks:
   ```bash
   ./scripts/getAssetStatus.sh 2
   ```
3. Complete the asset exchange in either of the two different ways:
    * Using a single command:
        - Run the following to trigger exchange of bond `bond01:a03` owned by `alice` in `network1` with `100` units of tokens `token1` owned by `bob` in `network2`:
          ```bash
          ./bin/fabric-cli asset exchange-all --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 alice:bond01:a03:bob:token1:100
          ```
        - To verify that `bob` now owns a bond in exchange for `alice` owning some tokens, run the following:
          ```bash
          ./scripts/getAssetStatus.sh 2
          ```
    * Using step-by-step commands:
        - Generate Secret-Hash Pair using following command (prints hash in base64):
          ```
          ./bin/fabric-cli hash --hash_fn=SHA256 secrettext
          ```
        - Run the following to trigger `alice` locking `bond01:a03` for `bob` in `network1`
          ```bash
          ./bin/fabric-cli asset exchange lock --timeout-duration=3600 --locker=alice --recipient=bob --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --target-network=network1 --param=bond01:a03
          ```
        - Run the following to verify `alice`'s lock:
          ```bash
          ./bin/fabric-cli asset exchange is-locked --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
          ```
        - Run the following to trigger `bob` locking `100` units of `token1` for `alice` in `network2`:
          ```bash
          ./bin/fabric-cli asset exchange lock --fungible --timeout-duration=1800 --locker=bob --recipient=alice --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --target-network=network2 --param=token1:100
          ```
          Note the `contract-id` printed as output in above command. The output line containing `contract-id` (text in base64 after `Contract Id:`) would like this:
          ```bash
          ℹ Fungible Asset Locked with Contract Id: E0JZq8Z+eS//2Bt4WU0pU210MvNgDC2hdUT1RgszOq0=, preimage: null, hashvalue: ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
          ```
        - Run the following to verify `bob`'s lock:
          ```bash
          ./bin/fabric-cli asset exchange is-locked --fungible --locker=bob --recipient=alice --target-network=network2 --contract-id=<contract-id>
          ```
        - Run the following to trigger `alice`'s claim for `100` units of `token1` locked by `bob` in `network2`:
          ```bash
          ./bin/fabric-cli asset exchange claim --fungible --recipient=alice --target-network=network2 --contract-id=<contract-id> --secret=<hash-pre-image>
          ```
        - Run the following to trigger `bob`'s claim for `bond01:a03` locked by `alice` in `network1`:
          ```bash
          ./bin/fabric-cli asset exchange claim --recipient=bob --locker=alice --target-network=network1 --param=bond01:a03 --secret=<hash-pre-image>
          ```

        The above steps complete a successful asset exchange between two Fabric networks. 
        In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

        - If `alice` wants to unlock the bond asset, run the following to trigger `alice`'s re-claim for `bond01:a03` locked in `network1`:
          ```bash
          ./bin/fabric-cli asset exchange unlock --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
          ```
        - If `bob` wants to unlock the token asset, run the following to trigger `bob`'s re-claim for `token1:100` locked in `network2`:
          ```bash
          ./bin/fabric-cli asset exchange unlock --fungible --locker=bob --target-network=network2 --contract-id=<contract-id>
          ```
