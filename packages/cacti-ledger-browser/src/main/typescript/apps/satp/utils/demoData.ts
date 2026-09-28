import { ParsedSessionDetails } from "../types";
import { buildSessionStages } from "./parser";

const now = Date.now();

/**
 * Demo transfer sessions faithfully inspired by Rafael's
 * "The Anatomy of SATP" interactive walkthrough:
 * https://rafaelapb.github.io/satp-demo/
 *
 * Demonstrates cross-ledger transfers between:
 * - Alice (Sender on Network A: Hyperledger Besu)
 * - Bob (Recipient on Network B: Hyperledger Fabric)
 * - Gateway 1: Client role (Besu connector)
 * - Gateway 2: Server role (Fabric connector)
 */
export const DEMO_SESSIONS: ParsedSessionDetails[] = [
  // 1. Primary Completed Transfer (Besu -> Fabric) as in "The Anatomy of SATP"
  {
    sessionId: "satp-session-besu-fabric-100units",
    status: "COMPLETED",
    substatus: "COMPLETED",
    currentStage: "STAGE_3",
    currentStep: "transferCompleteMessage",
    originNetwork: "Network A — Hyperledger Besu",
    destinationNetwork: "Network B — Hyperledger Fabric",
    assetReference: "100 Units · ERC-20 Asset (0x9bca...Token)",
    amount: "100",
    senderAddress: "Alice (0x9Bca3...Alice)",
    recipientAddress: "Bob (bob@fabric-org1)",
    startTime: new Date(now - 15 * 60 * 1000).toISOString(),
    lastUpdate: new Date(now - 12 * 60 * 1000).toISOString(),
    hasRollback: false,
    hasFailure: false,
    stages: buildSessionStages(
      "STAGE_3",
      "COMPLETED",
      "transferCompleteMessage",
      [],
    ),
    auditTrail: [
      {
        auditEntryId: "ae-001",
        sequenceNumber: 1,
        timestamp: now - 15 * 60 * 1000,
        isoTime: new Date(now - 15 * 60 * 1000).toISOString(),
        operation: "stage_0_newSessionRequest",
        type: "HANDSHAKE",
        key: "proof-session-req-001",
        rawData: JSON.stringify(
          {
            step: "newSessionRequest",
            direction: "Gateway 1 (Client) -> Gateway 2 (Server)",
            summary:
              "Alice's app activates transfer; Gateway 1 discovers Gateway 2 and opens session.",
            clientGateway: "Gateway 1 (Besu Connector)",
            serverGateway: "Gateway 2 (Fabric Connector)",
            sessionContext: "ctx-besu-fabric-100u",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "newSessionRequest",
          direction: "Gateway 1 (Client) -> Gateway 2 (Server)",
          clientGateway: "Gateway 1 (Besu Connector)",
          serverGateway: "Gateway 2 (Fabric Connector)",
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-002",
        sequenceNumber: 2,
        timestamp: now - 14.8 * 60 * 1000,
        isoTime: new Date(now - 14.8 * 60 * 1000).toISOString(),
        operation: "stage_0_preSATPTransferRequest",
        type: "NEGOTIATION",
        key: "proof-terms-req-002",
        rawData: JSON.stringify(
          {
            step: "preSATPTransferRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "Gateways agree on transfer terms: 100 units from Besu Network A to Fabric Network B.",
            terms: {
              sourceLedger: "Network A (Besu)",
              destinationLedger: "Network B (Fabric)",
              amount: "100",
              sender: "Alice",
              recipient: "Bob",
            },
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "preSATPTransferRequest",
          terms: {
            sourceLedger: "Network A (Besu)",
            destinationLedger: "Network B (Fabric)",
            amount: "100",
          },
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-003",
        sequenceNumber: 3,
        timestamp: now - 14.2 * 60 * 1000,
        isoTime: new Date(now - 14.2 * 60 * 1000).toISOString(),
        operation: "stage_1_transferProposalRequest",
        type: "PROPOSAL",
        key: "proof-proposal-claim-003",
        rawData: JSON.stringify(
          {
            step: "transferProposalRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "Signed transfer request created and signed by Client Gateway committing terms.",
            transferClaims: {
              assetProfile: "ERC-20",
              amount: "100",
              sourceOwner: "Alice (0x9Bca3...Alice)",
              destinationOwner: "Bob (bob@fabric-org1)",
            },
            hashPreviousMessage: "0x0000000000000000000000000000000000000000",
            clientSignature: "0x30450221008e...verified_g1",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "transferProposalRequest",
          amount: "100",
          clientSignatureVerified: true,
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-004",
        sequenceNumber: 4,
        timestamp: now - 13.8 * 60 * 1000,
        isoTime: new Date(now - 13.8 * 60 * 1000).toISOString(),
        operation: "stage_1_transferCommenceRequest",
        type: "COMMENCE",
        key: "proof-commence-req-004",
        rawData: JSON.stringify(
          {
            step: "transferCommenceRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "Both gateways hold signed evidence of identical terms. Hash chain locked.",
            hashPreviousMessage: "0x892a01bf78e90c...proposal_hash",
            commenceStatus: "AGREED",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "transferCommenceRequest",
          hashChainValid: true,
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-005",
        sequenceNumber: 5,
        timestamp: now - 13.2 * 60 * 1000,
        isoTime: new Date(now - 13.2 * 60 * 1000).toISOString(),
        operation: "stage_2_lockAssertionRequest",
        type: "LOCK_PROOF",
        key: "proof-lock-besu-005",
        rawData: JSON.stringify(
          {
            step: "lockAssertionRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "100 units locked on Besu Network A. Custody shifts from Client to Shared.",
            ledgerState: "100 units · locked on Besu",
            custodyState: "shared custody",
            txHash:
              "0x7a89bc21e54910283fa7162984ef2981765c82901a8ef18290312019482fa810",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "lockAssertionRequest",
          lockedAmount: "100",
          sourceLedger: "Besu",
          txHash: "0x7a89bc...fa810",
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-006",
        sequenceNumber: 6,
        timestamp: now - 12.7 * 60 * 1000,
        isoTime: new Date(now - 12.7 * 60 * 1000).toISOString(),
        operation: "stage_3_commitPreparationRequest",
        type: "PREPARE_MINT",
        key: "proof-commit-prep-006",
        rawData: JSON.stringify(
          {
            step: "commitPreparationRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "Gateway 2 prepares to mint 100 units on Fabric Network B.",
            fabricChannel: "channel-token-1",
            chaincode: "satp-token-contract",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "commitPreparationRequest",
          mintPrepared: true,
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-007",
        sequenceNumber: 7,
        timestamp: now - 12.3 * 60 * 1000,
        isoTime: new Date(now - 12.3 * 60 * 1000).toISOString(),
        operation: "stage_3_commitFinalAssertionRequest",
        type: "BURN_PROOF",
        key: "proof-final-assertion-007",
        rawData: JSON.stringify(
          {
            step: "commitFinalAssertionRequest",
            direction: "Gateway 1 -> Gateway 2",
            summary:
              "100 units burned on Besu Network A. Evidence provided to Gateway 2.",
            burnTxHash:
              "0x9812af1209384bc192083109a8f2190823091823098120398102938102938012",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "commitFinalAssertionRequest",
          burnConfirmed: true,
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-008",
        sequenceNumber: 8,
        timestamp: now - 12.0 * 60 * 1000,
        isoTime: new Date(now - 12.0 * 60 * 1000).toISOString(),
        operation: "stage_3_transferCompleteMessage",
        type: "FINALIZATION",
        key: "proof-complete-receipt-008",
        rawData: JSON.stringify(
          {
            step: "transferCompleteMessage",
            direction: "Gateway 2 -> Gateway 1",
            summary:
              "100 units assigned to Bob on Fabric Network B. Final settlement custody assigned.",
            custodyState: "server custody · Bob",
            fabricCommitTx: "fabric-tx-besu-fab-100u-block-5120",
            status: "SUCCESS",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "transferCompleteMessage",
          finalRecipient: "Bob",
          settlementConfirmed: true,
        },
        isError: false,
        isRollback: false,
      },
    ],
  },

  // 2. Failed Transfer with Automated Rollback (Besu -> Fabric lock timeout)
  {
    sessionId: "satp-session-besu-fabric-rollback",
    status: "FAILED",
    substatus: "LOCK_TIMEOUT_ROLLBACK",
    currentStage: "STAGE_2",
    currentStep: "lockAssertionReceipt",
    originNetwork: "Network A — Hyperledger Besu",
    destinationNetwork: "Network B — Hyperledger Fabric",
    assetReference: "50 Units · ERC-20 Asset (0x9bca...Token)",
    amount: "50",
    senderAddress: "Alice (0x9Bca3...Alice)",
    recipientAddress: "Bob (bob@fabric-org1)",
    startTime: new Date(now - 8 * 60 * 1000).toISOString(),
    lastUpdate: new Date(now - 5 * 60 * 1000).toISOString(),
    hasRollback: true,
    hasFailure: true,
    failureReason:
      "Lock assertion confirmation on Network A timed out after 30s. Automated rollback and compensation triggered: 50 units unlocked and refunded to Alice on Besu.",
    stages: buildSessionStages("STAGE_2", "FAILED", "lockAssertionReceipt", []),
    auditTrail: [
      {
        auditEntryId: "ae-rb-001",
        sequenceNumber: 1,
        timestamp: now - 8 * 60 * 1000,
        isoTime: new Date(now - 8 * 60 * 1000).toISOString(),
        operation: "stage_1_transferProposalRequest",
        type: "PROPOSAL",
        key: "proof-proposal-rb-001",
        rawData: JSON.stringify(
          {
            step: "transferProposalRequest",
            amount: "50",
            source: "Alice",
            destination: "Bob",
          },
          null,
          2,
        ),
        parsedPayload: {
          amount: "50",
          proposalAccepted: true,
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-rb-002",
        sequenceNumber: 2,
        timestamp: now - 7.5 * 60 * 1000,
        isoTime: new Date(now - 7.5 * 60 * 1000).toISOString(),
        operation: "stage_2_lockAssertionRequest",
        type: "LOCK_PROOF",
        key: "proof-lock-rb-002",
        rawData: JSON.stringify(
          {
            step: "lockAssertionRequest",
            status: "PENDING_CONFIRMATION",
            expectedTimeoutMs: 30000,
          },
          null,
          2,
        ),
        parsedPayload: {
          lockStatus: "PENDING_CONFIRMATION",
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-rb-003",
        sequenceNumber: 3,
        timestamp: now - 6.5 * 60 * 1000,
        isoTime: new Date(now - 6.5 * 60 * 1000).toISOString(),
        operation: "stage_2_lock_timeout_error",
        type: "ERROR_DIAGNOSTIC",
        key: "proof-error-rb-003",
        rawData: JSON.stringify(
          {
            errorCode: "SATP_ERR_LOCK_TIMEOUT",
            message:
              "Source ledger lock assertion receipt did not arrive within timeout window.",
            actionRequired: "INITIATE_ROLLBACK_COMPENSATION",
          },
          null,
          2,
        ),
        parsedPayload: {
          errorCode: "SATP_ERR_LOCK_TIMEOUT",
        },
        isError: true,
        isRollback: false,
      },
      {
        auditEntryId: "ae-rb-004",
        sequenceNumber: 4,
        timestamp: now - 5.5 * 60 * 1000,
        isoTime: new Date(now - 5.5 * 60 * 1000).toISOString(),
        operation: "stage_2_rollback_compensation_receipt",
        type: "ROLLBACK_REFUND",
        key: "proof-refund-rb-004",
        rawData: JSON.stringify(
          {
            action: "COMPENSATION_UNLOCK",
            ledger: "Hyperledger Besu (Network A)",
            recipient: "Alice (0x9Bca3...Alice)",
            refundedAmount: "50",
            refundTxHash:
              "0x4ca1823901bcae81290318230192830192830192830192830192830192830192",
            custodyState: "client custody (Alice)",
            status: "REFUNDED",
          },
          null,
          2,
        ),
        parsedPayload: {
          action: "COMPENSATION_UNLOCK",
          refundedAmount: "50",
          custodyRestored: "Alice",
        },
        isError: false,
        isRollback: true,
      },
    ],
  },

  // 3. Ongoing Active Transfer (Besu -> Fabric at Stage 2 Lock)
  {
    sessionId: "satp-session-besu-fabric-active",
    status: "IN_PROGRESS",
    substatus: "LOCKING_SOURCE_ASSET",
    currentStage: "STAGE_2",
    currentStep: "lockAssertionRequest",
    originNetwork: "Network A — Hyperledger Besu",
    destinationNetwork: "Network B — Hyperledger Fabric",
    assetReference: "250 Units · ERC-20 Asset (0x9bca...Token)",
    amount: "250",
    senderAddress: "Alice (0x9Bca3...Alice)",
    recipientAddress: "Bob (bob@fabric-org1)",
    startTime: new Date(now - 2 * 60 * 1000).toISOString(),
    lastUpdate: new Date(now - 30 * 1000).toISOString(),
    hasRollback: false,
    hasFailure: false,
    stages: buildSessionStages(
      "STAGE_2",
      "IN_PROGRESS",
      "lockAssertionRequest",
      [],
    ),
    auditTrail: [
      {
        auditEntryId: "ae-act-001",
        sequenceNumber: 1,
        timestamp: now - 2 * 60 * 1000,
        isoTime: new Date(now - 2 * 60 * 1000).toISOString(),
        operation: "stage_0_newSessionRequest",
        type: "HANDSHAKE",
        key: "proof-act-session-001",
        rawData: JSON.stringify(
          {
            step: "newSessionRequest",
            client: "Gateway 1 (Besu)",
            server: "Gateway 2 (Fabric)",
            status: "INITIALIZED",
          },
          null,
          2,
        ),
        parsedPayload: {
          client: "Gateway 1 (Besu)",
          server: "Gateway 2 (Fabric)",
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-act-002",
        sequenceNumber: 2,
        timestamp: now - 1.5 * 60 * 1000,
        isoTime: new Date(now - 1.5 * 60 * 1000).toISOString(),
        operation: "stage_1_transferProposalRequest",
        type: "PROPOSAL",
        key: "proof-act-prop-002",
        rawData: JSON.stringify(
          {
            step: "transferProposalRequest",
            amount: "250",
            source: "Alice",
            destination: "Bob",
          },
          null,
          2,
        ),
        parsedPayload: {
          amount: "250",
          status: "ACCEPTED",
        },
        isError: false,
        isRollback: false,
      },
      {
        auditEntryId: "ae-act-003",
        sequenceNumber: 3,
        timestamp: now - 30 * 1000,
        isoTime: new Date(now - 30 * 1000).toISOString(),
        operation: "stage_2_lockAssertionRequest",
        type: "LOCK_PROOF",
        key: "proof-act-lock-003",
        rawData: JSON.stringify(
          {
            step: "lockAssertionRequest",
            status: "LOCKING",
            ledger: "Hyperledger Besu",
            amount: "250",
          },
          null,
          2,
        ),
        parsedPayload: {
          step: "lockAssertionRequest",
          status: "LOCKING",
        },
        isError: false,
        isRollback: false,
      },
    ],
  },
];
