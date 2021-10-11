---
id: asset-exchange
title: Asset Exchange
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the asset-exchange interoperation protocol on the test network [launched earlier](../test-network/overview).

For this scenario, you only need the networks to be running with the appropriate contracts deployed and the ledgers bootstrapped. You do not need to run relays and drivers. You can run the following combinations of exchanges (_other combinations of DLTs will be supported soon_):
1. **Fabric with Fabric**: One Fabric network transfers a bond from Alice to Bob in exchange for a transfer of tokens from Bob to Alice in the other network

Assuming that one of the following chaincodes have been deployed in both networks:
* `simpleasset`
* `simpleassetandinterop`
* `simpleassettransfer`
run the following steps:
1. Navigate to either the `samples/fabric/fabric-cli` folder or the `samples/fabric/go-cli` folder in your clone of the Weaver repository.
2. Run the following to verify the status of the assets owned by `alice` and `bob` in the two networks:
   ```bash
   ./scripts/getAssetStatus.sh
   ```
3. Complete the asset exchange in either of the two different ways:
   * Using a single command:
     - Run the following to trigger exchange of bond `bond01:a03` owned by `alice` in `network1` with `100` units of tokens `token1` owned by `bob` in `network2`:
       ```bash
       ./bin/fabric-cli asset exchange-all --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 alice:bond01:a03:bob:token1:100
       ```
     - To verify that `bob` now owns a bond in exchange for `alice` owning some tokens, run the following:
       ```bash
       ./scripts/getAssetStatus.sh
       ```
   * Using step-by-step commands:
     - Run the following to trigger `alice` locking `bond01:a03` for `bob` in `network1`
       ```bash
       ./bin/fabric-cli asset exchange-step --step=1 --timeout-duration=3600 --locker=alice --recipient=bob --secret=<hash-pre-image> --target-network=network1 --param=bond01:a03
       ```
     - Run the following to verify `alice`'s lock:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=2 --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
       ```
     - Run the following to trigger `bob` locking `100` units of `token1` for `alice` in `network2`:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=3 --timeout-duration=1800 --locker=bob --recipient=alice --hash=<hash-value> --target-network=network2 --param=token1:100
       ```
     - Run the following to verify `bob`'s lock:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=4 --locker=bob --recipient=alice --target-network=network2 --contract-id=<contract-id>
       ```
     - Run the following to trigger `alice`'s claim for `100` units of `token1` locked by `bob` in `network2`:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=5 --recipient=alice --locker=bob --target-network=network2 --contract-id=<contract-id> --secret=<hash-pre-image>
       ```
     - Run the following to verify the claim:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=6 --recipient=bob --locker=alice --target-network=network1 --param=bond01:a03 --secret=<hash-pre-image>
       ```
     - Run the following to trigger `bob`'s claim for `bond01:a03` locked by `alice` in `network1`:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=7 --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
       ```
     - Run the following to verify the claim:
       ```bash
       ./bin/fabric-cli asset exchange-step --step=8 --locker=bob --recipient=alice --target-network=network2 --contract-id=<contract-id>
       ```
