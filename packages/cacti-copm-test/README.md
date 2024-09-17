# @hyperledger-cacti/cacti-copm-test

Test framework for testing the COPM distributed ledger-specific plugins.

## Development

To add testing for a new distributed ledger, implement the interfaces defined in src/main/typescript/interfaces
  
  - TestAssets:
    - provides methods for 
      - issueing bonds and tokens
      - checking the owner of a bond
      - checking the token balance
  - CopmTester:
    - manages instantiating the ledger-specific plugin
    - defines the parties in a test network (partyA and partyB)
    - for a party in a network:
      - returns the test-assets implementation 
      - returns the gprc client 

The CopmTester for a new network type should be returned by the copm-tester-factory function.

## Test Components and Networks

The Makefile in this directory provides targets for building test network components.  Some setup is shared between networks.

Makefile_\<ledger_type\> will build a docker weaver network of the given network type with the following commands:

- make setup
  - build all weaver components
- make pledge-network
  - makes a network for running pledge/claim (asset transfer)
- make lock-network
  - makes a network for running lock/claim (asset exchange)
  
The asset exchanges and asset transfer network modes are currently mutually exclusive.


