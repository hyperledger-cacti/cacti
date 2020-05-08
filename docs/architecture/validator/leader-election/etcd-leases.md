# Leader Election via Etcd's Distributed Synchronization Primitives

## Summary

Validators nodes self-elect a leader by leveraging the Etcd API's `watch` and `lease` features. Hyperledger Cactus depends on Etcd API version 3, but other than that it's able to work with any Etcd cluster or single node configuration as long as connectivity is achievable.

At startup, each node attempts to make themselves leader, which will only succeed if there is no current leader.

If a validator node fails to become leader, it starts acting as a follower.
The identity of the leader node is stored under a specific key in Etcd on which the leader holds the lease.

Followers are watching the key storing the leaders identity and react to changes as soon as the change is detected, there is no polling that would waste network/compute resources.

Stability of the leader election is guaranteed by the Raft algorithm that Etcd uses under the hood.

## Deployment Diagram

![leader-election-etcd-leases-deployment-caption](https://www.plantuml.com/plantuml/png/0/bPDHIyCm58NVyokkyqN1CbUVX6siSnqEn8cJlOYCBBtJOfgKD9qCqT_kJLPhf-Am5Cev-UxDIT8C2ikDBJC94dc29a29mgPQ1MX54f1PO14ac4kzoL3PGF3S3RE3L0bP9WXTM-OyCMTjeRDCgtvZHAzMgS3s3CqQJT5EkELBwhSelF47oVDSfeAxYMgO2PeU3JpvdEnoawEHc3oIDPHQF8iddYgO4FDeV2MC3S_mHPjdnb0bLHspgPN80Bfb_yfR45TBXb6zJ1YbdDfatNRPzzMmBViCiTBQVVuJuWJ2qyuvOojdm70oXbT6CROofirUNCYoS5rv0IXe5EYPZiUBKNGN3QDPl9Z5j_FuziYTJEUavMgWqph-amihBjp3gOgxzjpRLx8vboaTd3RDUEjclEZcvcfo4TrDfjUV7PThHG7hqfsKl-DX4m_tugg9rvdfTQsW-_xU1qSvsI7fLRYZ51shsySjxBUgDhPQUHqsTDMWTt-ub2K-zCWNrOm_FFNTOmFwZUYYVG00 "leader-election-etcd-leases-deployment-caption")

## Validator Node State Diagram

![state-diagram-validator](https://www.plantuml.com/plantuml/png/0/XL9DRy8m3BtdL_WsQLgrZziGGkm3j4re5v1sM7R86WCHgLsbPen_FxUbG4yxrNrvp-_PoRWIbsHRHD12CFF1hP8hiXyNWtV2oHW94X4i3RUZ6JgF2IOHSmbCCAyryDngXjVRaIMpP1RbM7hPbvWY-fN-FKRED_dQ1O9N4bHwev-g37USDbTmTtDxRypdvHTasQXkd0IzENmRxCcHhpDXXmxWdJs-pQ5Cd6DL6NEam00UHB0efG9Xu6zHQqlgIm9g7D5LQ8cNC97SmmRtffrj07DKJOUgs184kQY0Trfu95t7tamvHjxLz0yd-HfRXQLM0Xvr1KKWjOXDMzKVjMSfTQfJfoQJIYdeu1qCvuDtdCLY1lXRXeI7rF-nUexTe2shMOaQddEKj6ZoE-b5wUETTHyrfxevqXirPepazOtz0G00 "state-diagram-validator")
