# OutboundWebhookEventType

Event type representing a distinct lifecycle moment in SATP protocol execution. External systems can filter and route events based on type.  Event Types: - stage.started: SATP stage has begun execution (outbound hooks at \'before\' step) - stage.completed: SATP stage finished successfully (outbound hooks at \'after\' step) - stage.failed: SATP stage encountered an error and may trigger rollback - adapter.retry: Adapter webhook is retrying after transient failure - adapter.skipped: Adapter was bypassed (inactive or condition not met)

## Enum

* `StageStarted` (value: `'stage.started'`)

* `StageCompleted` (value: `'stage.completed'`)

* `StageFailed` (value: `'stage.failed'`)

* `AdapterRetry` (value: `'adapter.retry'`)

* `AdapterSkipped` (value: `'adapter.skipped'`)

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
