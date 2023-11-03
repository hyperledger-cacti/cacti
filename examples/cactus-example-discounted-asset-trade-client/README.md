# cactus-example-discounted-asset-trade-client
- Client applications and helper libraries for interacting with test indy ledger and Cacti discounted asset trade example app.
- Uses Hyperledger Aries Framework JavaScript (AFJ).
- **Before running any of the script make sure that test indy ledger is running and it's config is available under `/etc/cactus/indy-all-in-one/` (at least `pool_transactions_genesis` should be there.)**

## Build
- This package will be build as part of main cacti build (`yarn run configure` in root dir), or can be build manually by running `yarn run build` from this directory).

## Setup Credentials Script
- This script can be used to setup indy credentials before running the example app, or to simply check indy test ledger operational status.
- Script will register employment credential, issue it to agent `Alice`, and check that employment proof is correct.
- Can be run repeatadelly.

``` bash
# Run the script
yarn setup-credentials

# Run with debug logs
LOG_LEVEL=DEBUG yarn setup-credentials
```

### Sample output

``` bash
Running with log level INFO
Connecting Alice with Issuer...
Connecting aliceCactiAgent to issuerCactiAgent...
Agents connected!
Register and issue the employment credential...
Register Credential Schema...
Register employment certificate credential schema 'cactiJobCert'...
Register Credential Definition...
Register job certificate credential definition (schemaId: 'did:indy:cacti:test:Th7MpTaRZVRYnPiabds81Y/anoncreds/v0/SCHEMA/cactiJobCert/1.0.0') ...
Issue the credential...
Accepting credential 018e6578-4e52-4ae0-8381-8c935c8a13dc...
Credential accepted!
Credential was issed and accepted by a peer agent!
Verify employment status proof...
Proof request was sent
Accepting proof 5c0986ab-4f1d-4850-a2ff-53c90ce34a12...
Proof request accepted!
Requested proof status: done
Finishing - cleaning up the agents...
All done.
``````

## Discounted Asset Trade Client
- Used to interact with discounted asset trade example application.
- Will connect Alice agent to sample application. After that you can choose action to perform.
- Actions:
    - `Start the trade`: Will send trade request to example app, asset2 will change owner and payment will be processed on etherem (see `cactus-example-discounted-asset-trade` README for more details)
    - `Get this agent credentials`: Get list of Alice credentials.
    - `Get assets`: Get example app asset list (both fabric assets and ethereum balances)
    - `Exit`: Cleanup and leave. Note - may take few seconds due to ongoing timeouts etc...
- Note: Use arrow keys to restore menu if any async message caused it to disappear.

``` bash
# Run the script
yarn run-discounted-asset-trade-client

# Run with debug logs
LOG_LEVEL=DEBUG yarn run-discounted-asset-trade-client
```

### Sample output

``` bash
Running with log level INFO
Connected to the discounted asset trade sample app agent! ID: 5a4f0cf6-b53a-4f3d-9494-112edfdfd626
Action: (Use arrow keys)
❯ Start the trade
  Get this agent credentials
  Get assets
  Exit
``````
