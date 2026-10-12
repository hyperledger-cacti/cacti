# FlowInvocationType

Determines which flow starting method will be used on the back-end when invoking the flow. Based on the value here the plugin back-end might invoke the rpc.startFlowDynamic() method or the rpc.startTrackedFlowDynamic() method. Streamed responses are aggregated and returned in a single response to HTTP callers who are not equipped to handle streams like WebSocket/gRPC/etc. do.

## Enum

* `TrackedFlowDynamic` (value: `'TRACKED_FLOW_DYNAMIC'`)

* `FlowDynamic` (value: `'FLOW_DYNAMIC'`)

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
