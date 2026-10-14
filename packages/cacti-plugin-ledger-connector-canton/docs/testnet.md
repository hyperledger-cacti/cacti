# Canton TestNet setup

The connector talks to a participant's **JSON Ledger API**, not the public
Scan API, wallet UI, validator API, or synchronizer sequencer. A public Scan
endpoint does not grant access to private party contracts. See the official
[API overview](https://docs.test.sync.global/app_dev/overview/index.html).

## Obtain a participant and connect it

Use a hosted TestNet participant supplied by your operator, or deploy your
own validator. For your own validator, obtain approval and a sponsoring Super
Validator, register the validator egress IP, and obtain an onboarding secret.
Follow [validator onboarding](https://docs.test.sync.global/validator_operator/validator_onboarding.html)
and the [deployment runbook](https://docs.test.sync.global/validator_operator/validator_compose.html).
DevNet self-service onboarding is not TestNet onboarding. Secrets expire and
must never be committed. Use the current network migration ID and sponsor URL
from your operator rather than copying LocalNet configuration.

The validator manages the participant's synchronizer connection. Ask the
operator to confirm that it is connected to the TestNet Global Synchronizer,
that the test party is hosted on it, and that the selected Daml package is
available. `ledgerClientUrl` points to the participant HTTPS JSON Ledger API
base URL; it is not a synchronizer URL. Connection management is outside this
connector. The official [validator API overview](https://docs.test.sync.global/app_dev/validator_api/index.html)
describes the validator's management responsibilities.

## Credentials and keys

Create a dedicated Ledger API user through the operator. Give it `CanReadAs`
for reading the test party and `CanActAs` only when writes are needed. Obtain
a short-lived JWT from the participant's configured identity provider with
the correct user subject, audience, and any required scope. Validator API
credentials are not automatically valid for the Ledger API. Follow the
[participant authentication configuration](https://docs.test.sync.global/validator_operator/validator_helm.html)
and [Ledger API authorization](https://docs.digitalasset.com/build/3.5/sdlc-howtos/applications/secure/authorization.html).

For deployed applications prefer the connector's `client_credentials` option
so tokens can refresh. Store client secrets in a secret manager; the opt-in
smoke suite below accepts a fresh static token for a single run. Do not print
tokens, copy them into screenshots, or enable shell tracing. Rotate exposed
credentials. The connector uses participant-hosted signing, so these tests
do not require a wallet private key or an external-signing key. The operator
still manages participant/node keys and identity-provider signing keys.

## Test tokens and synchronizer traffic

A JWT access token authenticates an API request; Canton Coin is a ledger
asset used by the network and is not that credential. Ask the TestNet
operator or sponsor for test-only Canton Coin and sufficient synchronizer
traffic before any write test. Do not assume that a LocalNet/DevNet tap works
on TestNet. Verify the available funding procedure with the operator and
never use MainNet funds. The [Token Standard documentation](https://docs.test.sync.global/app_dev/token_standard/index.html)
describes token interfaces; the [network testing guidelines](https://docs.test.sync.global/app_dev/testing/networks_and_usecases.html)
distinguish local CI from TestNet deployment.

The review also points to the [TestNet faucet](https://testnet-faucet.canton.foundation/).
Confirm its current access requirements and eligible party/wallet with the
operator before requesting funds; faucet availability and funding were not
verified by these tests. See the [deployment progression FAQ](https://docs.canton.network/appdev/faq#how-do-i-move-from-devnet-to-testnet-to-mainnet).

For experiments involving public token activity, the reviewer suggested
[CCView TestNet](https://testnet.ccview.io/) and
[CantonLoop Lighthouse TestNet](https://lighthouse.testnet.cantonloop.com/).
Use the Ledger API read-back assertions to verify private contracts: an
explorer cannot establish visibility of a party's private contract state.

## Run opt-in smoke tests

The suite uses the real Wallet SDK and participant, without mocks. It skips
unless explicitly enabled and fails setup if a required value is missing.
Supply these values through your secret manager or private environment:

| Variable                          | Value                                          |
| --------------------------------- | ---------------------------------------------- |
| `CANTON_TESTNET_ENABLED`          | `true` to permit remote requests               |
| `CANTON_TESTNET_LEDGER_API_URL`   | Participant HTTPS JSON Ledger API base URL     |
| `CANTON_TESTNET_LEDGER_API_TOKEN` | Fresh Ledger API JWT; secret                   |
| `CANTON_TESTNET_PARTY_ID`         | Full hosted party ID, including its namespace  |
| `CANTON_TESTNET_TEMPLATE_ID`      | Installed template ID approved by the operator |

From the repository root, after building:

```bash
NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand \
  packages/cacti-plugin-ledger-connector-canton/src/test/typescript/integration/canton-testnet-connector.test.ts
```

The smoke tests discover the party and read its template-filtered ACS. An
empty ACS is valid. The write test is explicitly `todo`: enable it only after
agreeing on a model, arguments, synchronizer routing, funds/traffic, and an
archive/cleanup choice. Do not run generic create commands against shared
production models. Record the network, package version, command IDs, and
sanitized CI results when adding write coverage. LocalNet remains the
deterministic positive/negative transaction test environment.

TestNet credentials were not supplied for this change, so a skipped suite is
not evidence of a successful live TestNet run. TestNet resets can invalidate
party IDs, packages, contracts, and provisioning; refresh these settings after
a reset using the [network reset instructions](https://docs.test.sync.global/validator_operator/validator_network_resets.html).
