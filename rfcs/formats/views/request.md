<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# View Requests

- RFC: 03-007
- Authors: Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 02-Apr-2022

## Summary

## Query

Query message is used to define the data that is being requested. This is used in relay-relay communication, where destination relay requests response for this query from source relay.

```protobuf
message Query {
  repeated string policy = 1;
  string address = 2;
  string requesting_relay = 3;
  string requesting_network = 4;
  string certificate = 5;
  string requestor_signature = 6;
  string nonce = 7;
  string request_id = 8;
  string requesting_org = 9;
}
```

## State

### ViewPayload

Encapsulates either error or the response view, identified by `request_id`.

```protobuf
// View represents the response from a remote network
message ViewPayload {
  string request_id = 1;
  oneof state {
    View view = 2;
    string error = 3;
  };
}
```

The `state` contains `view` field (if success), which is an instance of `View` defined [here](./view-definition).
The driver will encapsulate the response view into `ViewPayload` message, and send it to the source relay. Source relay will send the same message to the destination relay.

### RequestState

This payload is used for the communication between the destination relay and the client application.

```protobuf
message RequestState {
  enum STATUS {
    // pending ACK from remote relay
    PENDING_ACK = 0;
    // Received ACK, waiting for data to be sent from remote relay
    PENDING = 1;
    ERROR = 2;
    COMPLETED = 3;
  };
  string request_id = 1;
  STATUS status = 2;
  oneof state {
    View view = 3;
    string error = 4;
  };
}
```

When client polls the destination relay for response for query identified by `request_id`, using [GetState](../../models/infrastructure/relays.md#api-for-application-client) API, the relay returns above payload, which consists of status of request, and the state which is either error message or the response view, that is an instance of `View` defined [here](./view-definition).

## Ack

This message is used for acknowledgement purpose in relays communication identified by `request_id`. If ack `status` is error, then an error message can also be passed in the `message` field.

```protobuf
message Ack {
  enum STATUS {
    OK = 0;
    ERROR = 1;
  };
  STATUS status = 2;
  string request_id = 3;
  // an error can have an associated string
  // this is the best way to represent this in protobuf
  string message = 4;
}
```
  
