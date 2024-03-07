/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 9544, // 7545 - default for Ganache
      network_id: "1338", // 4447 - default for Ganache
      //type: "fabric-evm",
      from: "0x35D99e41ce0Aa49d1B2B62f286b9F4189df7B7ae",
      gasPrice: 0,
      gas: "0x1ffffffffffffe",
      verbose: true, // helps with debugging contract deployment issues
    },
  },
  compilers: {
    solc: {
      // Unless this is pinned to 0.8.8, some breaking changes that solc
      // has snuck in [1][2] around 0.8.15 (for IR) are breaking the contract
      // deployment in a way that opcodes end up in the migration contract's
      // constructor that Besu does not recognize ("opcode INVALID") in
      // the Besu logs and then sends back an "internal error" message
      // via the JSON-RPC response, which is a bug IMO it should state
      // that the user input was invalid (user input being the contract)
      //
      // [1]: https://docs.soliditylang.org/en/v0.8.15/ir-breaking-changes.html#semantic-only-changes
      // [2]: https://github.com/ethereum/solidity/issues/13311#issuecomment-1199274310
      version: "0.8.8",
      settings: {
        optimizer: {
          enabled: true,
          runs: 1500,
        },
        // If set to true, then the following error occurs:
        // > Compiling ./contracts/transferInterface.sol
        // YulException: Variable var_amount_3290 is 9 slot(s) too deep inside the stack.
        viaIR: false,
      },
    },
  },
};
