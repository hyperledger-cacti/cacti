<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# View Definition

- RFC: 03-002
- Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna, Sandeep Nishad
- Status: Proposed
- Since: 30-May-2022

## Summary


## Definition 

- View data must be encoded (see `data` field in view definition below.)
- What encoding do we use?
- Encodings can be specified by the creator (driver) and specified in `meta`.

```protobuf
message Meta {
  enum Protocol {
      BITCOIN = 0;
      ETHEREUM = 1;
      FABRIC = 3;
      CORDA = 4;
  }

  // Underlying distributed ledger protocol.
  Protocol protocol = 1;

  // What notion of time?
  // If the observer and network are synchronizing on a global clock
  // there won't be a need to distinguish between static and dynamic views.
  string timestamp = 2;

  // Notorization, SPV, ZKP, etc. Possibly enum
  string proof_type = 3;

  // The data field's serialization format (e.g. JSON, XML, Protobuf)
  string serialization_format = 4;
}

message View {
  Meta meta = 1;

  // Represents the data playload of this view.
  // The representation of Fabric, Corda etc will be captured elsewhere.
  // For some protocols, like Bitcoin, the structure of an SPV proof is well known.
  bytes data = 2;
}
```

## Examples

View returned from a Corda network:

```
meta {
  protocol: CORDA
  timestamp: "Thu Aug 06 03:58:54 GMT 2020"
  proof_type: "Notarization"
  serialization_format: "JSON"
}
data: "eyJub3Rhcml6YXRpb25zIjpbeyJzaWduYXR1cmUiOiJRYkt4UXFLbHNMSkg4TUM2ZU9GaFEvRUxmdWw3bGJrVnJRVHdtNFhtZmc1eEpYZU56OHh0cXY4YW55Nkg0anlYWHNreUZ4WVdMSVNvc0FmY1VkZDBCQVx1MDAzZFx1MDAzZCIsImNlcnRpZmljYXRlIjoiLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tXG5NSUlCd2pDQ0FWK2dBd0lCQWdJSVVKa1F2bUttMzVZd0ZBWUlLb1pJemowRUF3SUdDQ3FHU000OUF3RUhNQzh4Q3pBSkJnTlZCQVlUQWtkQ01ROHdEUVlEVlFRSERBWk1iMjVrYjI0eER6QU5CZ05WQkFvTUJsQmhjblI1UVRBZUZ3MHlNREEzTWpRd01EQXdNREJhRncweU56QTFNakF3TURBd01EQmFNQzh4Q3pBSkJnTlZCQVlUQWtkQ01ROHdEUVlEVlFRSERBWk1iMjVrYjI0eER6QU5CZ05WQkFvTUJsQmhjblI1UVRBcU1BVUdBeXRsY0FNaEFNTUthUkVLaGNUZ1NCTU16Szgxb1BVU1BvVm1HL2ZKTUxYcS91alNtc2U5bzRHSk1JR0dNQjBHQTFVZERnUVdCQlJNWHREc0tGWnpVTGRRM2MyRENVRXgzVDFDVURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUFzR0ExVWREd1FFQXdJQ2hEQVRCZ05WSFNVRUREQUtCZ2dyQmdFRkJRY0RBakFmQmdOVkhTTUVHREFXZ0JSNGh3THVMZ2ZJWk1FV3pHNG4zQXh3ZmdQYmV6QVJCZ29yQmdFRUFZT0tZZ0VCQkFNQ0FRWXdGQVlJS29aSXpqMEVBd0lHQ0NxR1NNNDlBd0VIQTBjQU1FUUNJQzdKNDZTeEREejNMakROckVQamp3UDJwcmdNRU1oN3IvZ0pwb3VRSEJrK0FpQStLelhEMGQ1bWlJODZEMm1ZSzRDM3RSbGkzWDNWZ25DZThDT3FmWXl1UWdcdTAwM2RcdTAwM2Rcbi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0ifV0sImRhdGEiOiJXMU5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BUUTBPREptTkdJNExXTXlaak10TkRnelpTMWhaREl4TFdGa1kyWmhZbUV4WkdOaE1pa3NJRk5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BUQm1OV1EwTUdZd0xUUmxPR1V0TkdRME9DMDRaalUxTFRjMk9HWTJORFpoWWpJMk9Ta3NJRk5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BURmhOalk0WVdVMExUTmtPVE10TkRVMU5TMDRNell5TFRWaFpURm1PVFZtTTJRek9Da3NJRk5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BURmlORGM1TW1ZekxUbGxNbUV0TkRBeE9DMDRNemM1TFRrM1pUTmtaR1UzWWpoalppa3NJRk5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BXWTJOekZsTjJOa0xUY3pabVF0TkRVd05pMDVZek5oTFRNNFpHSmlaREZoWVRVMk5Da3NJRk5wYlhCc1pWTjBZWFJsS0d0bGVUMUlMQ0IyWVd4MVpUMHhMQ0J2ZDI1bGNqMVBQVkJoY25SNVFTd2dURDFNYjI1a2IyNHNJRU05UjBJc0lHeHBibVZoY2tsa1BUUXlaRE0yTnpNMkxUazNNVFF0TkRVNE55MWlNR05sTFdGa1pUSTRNekJoTlRjNVpTbGQifQ=="
```

## Commitment (Future Work)

```protobuf
message Commitment {
    // How is the commitment exchanged/located?
    string address = 3;
	// Cryptographic commitment scheme
    string scheme = 1;
}
```

We intend to add a commitment field to Meta in the future as a mechanism to make public commitments of state with freshness guarantees.

