# API3 Adapter Layer

**Version:** v1.1.0 | **Last Updated:** December 2025

Hook custom logic into SATP transfers—validate requests, notify dashboards, or require manual approval.

## Quick Start

### 1. Notify when a transfer starts

```yaml
adapters:
  - id: "transfer-notifier"
    name: "Transfer Start Notifier"
    active: true
    executionPoints:
      - stage: 0
        step: newSessionRequest
        point: "before"
    outboundWebhook:
      url: "https://your-api.com/transfer-started"
      timeoutMs: 5000
```

Your endpoint receives a POST with transfer details. Return `200 OK` to acknowledge.

### 2. Require manual approval

```yaml
adapters:
  - id: "compliance-gate"
    name: "Compliance Approval"
    active: true
    executionPoints:
      - stage: 1
        step: lockAssertionRequest
        point: "before"
    inboundWebhook:
      urlSuffix: "/approval/compliance"
      timeoutMs: 300000  # 5 min timeout
```

Transfer pauses until someone POSTs:

```bash
curl -X POST https://gateway/api/v1/adapters/inbound/approval/compliance \
  -d '{"adapterId": "compliance-gate", "continue": true, "reason": "Approved"}'
```

## Common Patterns

### Validate + Notify at multiple stages

```yaml
adapters:
  - id: "transfer-validator"
    name: "Transfer Validation"
    active: true
    priority: 1
    executionPoints:
      # Validate before session starts
      - stage: 0
        step: checkNewSessionRequest
        point: "before"
      # Validate before proposal
      - stage: 1
        step: checkTransferProposalRequestMessage
        point: "before"
    outboundWebhook:
      url: "https://validator.example.com/check"
      timeoutMs: 5000
      retryAttempts: 3

  - id: "dashboard-notifier"
    name: "Dashboard Updates"
    active: true
    priority: 10
    executionPoints:
      # Notify after session created
      - stage: 0
        step: newSessionResponse
        point: "after"
      # Notify after assets locked
      - stage: 2
        step: lockAssertionResponse
        point: "after"
      # Notify on completion
      - stage: 3
        step: transferComplete
        point: "after"
    outboundWebhook:
      url: "https://dashboard.example.com/events"
      timeoutMs: 3000
```

### Multi-approval workflow

```yaml
adapters:
  - id: "kyc-check"
    name: "KYC Validation"
    active: true
    priority: 1
    executionPoints:
      - stage: 0
        step: newSessionRequest
        point: "before"
    outboundWebhook:
      url: "https://kyc.example.com/validate"
      timeoutMs: 10000
    inboundWebhook:
      urlSuffix: "/kyc/decision"
      timeoutMs: 60000

  - id: "compliance-approval"
    name: "Compliance Review"
    active: true
    priority: 2
    executionPoints:
      - stage: 1
        step: transferProposalRequest
        point: "before"
    inboundWebhook:
      urlSuffix: "/compliance/approve"
      timeoutMs: 300000

global:
  timeoutMs: 5000
  retryAttempts: 3
  logLevel: debug
```

## Payloads

### Outbound (what your endpoint receives)

```json
{
  "eventType": "stage.started",
  "stage": 0,
  "stepTag": "newSessionRequest",
  "stepOrder": "before",
  "adapterId": "transfer-validator",
  "sessionId": "sess-abc123",
  "contextId": "transfer-2025-001",
  "gatewayId": "gateway-east",
  "timestamp": "2025-12-11T10:30:00Z",
  "payload": { "sourceAsset": "CBDC-USD", "amount": 1000000 }
}
```

### Inbound (what you POST to approve/reject)

```json
{ "adapterId": "compliance-gate", "continue": true, "reason": "Approved by Alice" }
```

```json
{ "adapterId": "compliance-gate", "continue": false, "reason": "Failed sanctions check" }
```

## SATP Steps Reference

| Stage | Step | Description |
|-------|------|-------------|
| **0** | `newSessionRequest` | Client initiates transfer |
| 0 | `checkNewSessionRequest` | Server validates session |
| 0 | `newSessionResponse` | Server responds |
| 0 | `preSATPTransferRequest` | Client sends pre-transfer |
| 0 | `preSATPTransferResponse` | Server responds |
| **1** | `transferProposalRequest` | Client proposes transfer |
| 1 | `checkTransferProposalRequestMessage` | Server validates proposal |
| 1 | `transferProposalResponse` | Server accepts/rejects |
| 1 | `transferCommenceRequest` | Client starts transfer |
| 1 | `transferCommenceResponse` | Server acknowledges |
| **2** | `lockAssertionRequest` | Client asserts lock |
| 2 | `checkLockAssertionRequest` | Server validates lock |
| 2 | `lockAssertionResponse` | Server confirms lock |
| **3** | `commitFinalAssertion` | Client commits |
| 3 | `checkCommitFinalAssertionRequest` | Server validates commit |
| 3 | `transferComplete` | Client signals completion |
| 3 | `transferCompleteResponse` | Server confirms |

Use `point: "before"` to intercept/validate, `point: "after"` to notify/log.

## Testing

### Local test server

```typescript
import { startAdapterTestServer, stopAdapterTestServer, loadAndPatchTestServerConfig } from "./adapter-test-utils";

const server = await startAdapterTestServer();  // Random port
const config = loadAndPatchTestServerConfig("my-config.yml");  // Patches URLs
// ... run tests ...
await stopAdapterTestServer();
```

### Test endpoints

| Endpoint | Returns |
|----------|---------|
| `POST /webhook/outbound` | `{ received: true }` |
| `POST /webhook/outbound/approve` | `{ continue: true }` |
| `POST /webhook/outbound/reject` | `{ continue: false }` |
| `POST /webhook/outbound/delay/2000` | Delays 2s |
| `POST /webhook/outbound/error/500` | HTTP 500 |

## Field Reference

### Adapter

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique, used in logs |
| `name` | yes | Human label |
| `active` | yes | `false` to disable |
| `priority` | no | Lower = first (default 100) |
| `executionPoints` | yes | When to run |
| `outboundWebhook` | no* | Fire-and-forget |
| `inboundWebhook` | no* | Blocking gate |

*Need at least one webhook type.

### Execution Point

| Field | Required |
|-------|----------|
| `stage` | yes (0-3) |
| `step` | yes |
| `point` | yes (`before`/`after`) |

### Outbound Webhook

| Field | Default |
|-------|---------|
| `url` | required |
| `method` | POST |
| `timeoutMs` | global |
| `retryAttempts` | global |
| `headers` | — |

### Inbound Webhook

| Field | Default |
|-------|---------|
| `urlSuffix` | required |
| `timeoutMs` | global |

## Tips

- Start with one outbound notifier, add approval gates later
- Use `priority` to control execution order
- 5-10s timeout for automated checks, 5+ min for manual approval
- Always include `reason` in decisions for audit trails
