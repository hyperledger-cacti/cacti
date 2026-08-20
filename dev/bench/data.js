window.BENCHMARK_DATA = {
  "lastUpdate": 1787214062583,
  "repoUrl": "https://github.com/hyperledger-cacti/cacti",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Ry Jones",
            "username": "ryjones",
            "email": "ry@linux.com"
          },
          "committer": {
            "name": "Ry Jones",
            "username": "ryjones",
            "email": "ry@linux.com"
          },
          "id": "ff89c40e9637d590830f56bc800fadf6489e519c",
          "message": "fix(connector-fabric): send full/private blocks as JSON not binary\n\nwatchBlocksV1 subscriptions of type Full and Private never delivered anything\nto the client. The connector received the block and called socket.emit, but\nWatchBlocksV1.Next never fired client-side, so the subscription sat idle and\nthe api-client re-subscribed over and over - eventually tripping the peer's\n\"too many requests for /protos.Deliver, exceeding concurrency limit (2500)\".\n\nThe cause is socket.io's binary packet path. socket.io scans every outgoing\npayload for Buffer instances; if it finds any it emits a binary packet, with\neach Buffer replaced by a placeholder and sent as a separate attachment frame,\nand the client only surfaces the event once every attachment is reassembled.\nA full/private Fabric BlockEvent carries ~27 Buffers, and that packet was\nnever reassembled into an event.\n\nMeasured on a Fabric 2.5 AIO ledger, emitting the raw block event:\n\n  jsonBytes=22219 buffers=27 maxDepth=22\n  socket.emit returned normally, socket.connected=true\n  ...client never receives; test times out\n\nSize was never the problem (22 KB against socket.io's 1 MB default), and\nneither JSON.stringify nor emit threw. Only the Buffers mattered. Filtered\nand the Cacti* block types were unaffected because their payloads contain no\nBuffers - the Cacti* paths run the block through a formatter first.\n\nRound-tripping the payload through JSON replaces each Buffer with the plain\n{type: \"Buffer\", data: [...]} form an HTTP client of this API would receive\nanyway, so it goes out as a single JSON packet. Applied to filtered as well:\nit is the same unguarded raw-SDK-object emit and is safe today only because\nof what those blocks happen to contain.\n\nBoth endpoints share these callbacks, and both were verified against a real\nFabric ledger. Every one of these previously ran until killed:\n\n  fabric-watch-blocks-v1-endpoint\n    Monitoring with type Full returns entire raw block      3566 ms\n    Monitoring with type Private returns private block      3558 ms\n  fabric-watch-blocks-delegated-sign-v1-endpoint\n    Monitoring with type Full returns entire raw block      3359 ms\n    Monitoring with type Private returns private block      3117 ms\n\nThe tests now bound their own wait for an event instead of relying on jest's\nrepo-wide 1 hour testTimeout, so the next regression of this kind fails in a\nminute naming the block type, rather than hanging for an hour. That is what\nlet this go unnoticed: the job was always cancelled before reporting.\n\nThis also lifts the jest_test_ignore quarantine added in the previous commit,\nso all 13 fabric-v2-2-x shards now run.\n\nRefs: #4472\n\nAssisted-by: anthropic:claude-opus-5\nSigned-off-by: Ry Jones <ry@linux.com>",
          "timestamp": "2026-08-14T09:41:33Z",
          "url": "https://github.com/hyperledger-cacti/cacti/commit/ff89c40e9637d590830f56bc800fadf6489e519c"
        },
        "date": 1787214058839,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "cmd-api-server_HTTP_GET_getOpenApiSpecV1",
            "value": 630,
            "range": "±3.30%",
            "unit": "ops/sec",
            "extra": "176 samples"
          },
          {
            "name": "cmd-api-server_gRPC_GetOpenApiSpecV1",
            "value": 613,
            "range": "±2.12%",
            "unit": "ops/sec",
            "extra": "182 samples"
          }
        ]
      }
    ]
  }
}