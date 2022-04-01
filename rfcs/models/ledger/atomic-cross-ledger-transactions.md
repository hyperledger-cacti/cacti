<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Atomic Cross-Ledger Transactions

- RFC: 01-006
- Authors: Venkatraman Ramakrishna, Ermyas Abebe, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 15-Jun-2021

## Summary

- The ability to commit transactions atomically in multiple ledgers is a core requirement for interoperability.
- This involves making transaction proposals/offers/intents as a first step (like in a 2-phase or 3-phase commit protocol in a distributed database).
- Either all transactions are finalized or all are reverted for cross-ledger integrity to be maintained.
- Transaction proposals and commitments must be verifiable by the counterparty ledger.
- The process relies on decentralized consensus and time locks within the distributed ledgers, and does not require trusted third parties or escrows.
- The interoperability modes, or use cases, of asset exchange and asset transfer can be realized in this model.

