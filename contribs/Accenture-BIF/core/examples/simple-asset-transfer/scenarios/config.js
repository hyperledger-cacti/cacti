const crypto = require(`crypto`);

function sha256(toCypher) {
  const hash = crypto.createHash(`sha256`);
  hash.update(toCypher);
  return hash.digest(`hex`);
}

module.exports = {
  blockchains: {
    quorum: {
      username: `test`,
      password: sha256(`123`).toUpperCase(),
      dlType: `QUORUM`,
      url: `http://127.0.0.1:5050`,
    },
    besu: {
      username: `test`,
      password: sha256(`123`).toUpperCase(),
      dlType: `BESU`,
      url: `http://127.0.0.1:6050`,
    },
    fabric: {
      username: `Hugo`,
      orgName: `Org2`,
      peerName: `peer0.org2.example.com`,
      dlType: `FABRIC`,
      url: `http://127.0.0.1:4000`,
    },
    corda: {
      username: `test`,
      password: sha256(`123`).toUpperCase(),
      dlType: `CORDA`,
      url: `http://127.0.0.1:10051`,
    },
  },
  federations: {
    quorum: [`tcp://127.0.0.1:7005`, `tcp://127.0.0.1:7006`, `tcp://127.0.0.1:7007`, `tcp://127.0.0.1:7008`],
    besu: [`tcp://127.0.0.1:7013`, `tcp://127.0.0.1:7014`, `tcp://127.0.0.1:7015`],
    fabric: [`tcp://127.0.0.1:7001`, `tcp://127.0.0.1:7002`, `tcp://127.0.0.1:7003`, `tcp://127.0.0.1:7004`],
    corda: [`tcp://127.0.0.1:7009`, `tcp://127.0.0.1:7010`, `tcp://127.0.0.1:7011`, `tcp://127.0.0.1:7012`],
  },
  assets: {
    quorum: {
      assetId: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          originDLTId: `DLT100`,
          originAssetId: `Asset_DLT100_1`,
        },
        {
          originDLTId: `DLT200`,
          originAssetId: `Asset_DLT200_1`,
        },
      ],
      properties: {
        property1: `value_property_1`,
        property2: `value_property_2`,
      },
    },
    besu: {
      assetId: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          originDLTId: `DLT100`,
          originAssetId: `Asset_DLT100_1`,
        },
        {
          originDLTId: `DLT200`,
          originAssetId: `Asset_DLT200_1`,
        },
      ],
      properties: {
        property1: `value_property_1`,
        property2: `value_property_2`,
      },
    },
    fabric: {
      asset_id: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          origin_dlt_id: `DLT100`,
          origin_asset_id: `Asset_DLT100_1`,
        },
        {
          origin_dlt_id: `DLT200`,
          origin_asset_id: `Asset_DLT200_1`,
        },
      ],
      properties: {
        property1: `value_property_1`,
        property2: `value_property_2`,
      },
    },
    corda: {
      assetId: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          originDLTId: `DLT100`,
          originAssetId: `Asset_DLT100_1`,
        },
        {
          originDLTId: `DLT200`,
          originAssetId: `Asset_DLT200_1`,
        },
      ],
      properties: {
        property1: `value_property_1`,
        property2: `value_property_2`,
      },
      async: false,
    },
  },
};
