<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Integration Tests and Testbeds for the Interoperation Framework

This folder houses everything test-related, including cross-component integration tests and different kinds of testbeds for experimentation. In the future, it may also contain performance measurement and benchmarking code.

Presently, we have implemented a _testnet_ that allows a user to launch up to three networks: two built on Fabric and one on Corda, each with interoperation-enabling components. Applications adapted for interoperation can then be deployed and flows involving the sharing of data with proof across a pair of networks tested. The code for this testnet lies [here](./network-setups).

A new subfolder must be created here to house any self-contained testbed like `network-setups` or integration test suite that serves a distinct purpose.
