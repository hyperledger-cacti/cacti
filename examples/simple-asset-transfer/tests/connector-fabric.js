/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint max-len: "off" */
/* eslint func-names: ["error", "never"] */
const chai = require(`chai`);
const cp = require(`chai-as-promised`);

const ConnectorFabricEx = require(`../fabric/connector`);
const config = require(`./config`);
const { Multisig } = require(`@hyperledger-labs/blockchain-integration-framework`);

chai.use(cp);

describe(`ConnectorFabricExample Constructor`, function() {
  it(`empty instance should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx();
      })
      .to.throw(ReferenceError);
  });

  it(`instance lacking params should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://10.0.0.0:4000`,
        });
      })
      .to.throw(ReferenceError);
  });

  it(`Invalid url should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://:6000`,
        });
      })
      .to.throw(TypeError);
  });

  it(`Invalid port should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://127.0.0.1:23`,
        });
      })
      .to.throw(RangeError);
  });

  it(`Non provided Fabric-specific param should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://127.0.0.1:4000`,
        });
      })
      .to.throw(ReferenceError);
  });

  it(`Wrong orgName should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://127.0.0.1:4000`,
          username: `smith`,
          orgName: 45,
        });
      })
      .to.throw(TypeError);
  });

  it(`Wrong peer should throw`, function() {
    chai
      .expect(function() {
        new ConnectorFabricEx({
          url: `http://127.0.0.1:4000`,
          username: `smith`,
          orgName: `org2`,
          peerName: 3,
        });
      })
      .to.throw(TypeError);
  });
});

describe(`ConnectorFabricExample getAccessToken`, function() {
  const options = config.blockchains.fabric;
  const connector1 = new ConnectorFabricEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`getAccessToken with correct credentials`, function(done) {
    chai.expect(connector1.getAccessToken()).to.eventually.be.fulfilled.notify(done);
  });

  it(`getAccessToken with wrong credentials`, function(done) {
    connector1.options.orgName = `org7`;
    chai
      .expect(connector1.getAccessToken())
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector1.options.url = 45;
    chai
      .expect(connector1.getAccessToken())
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorFabricExample addForeignValidator`, function() {
  const options = config.blockchains.fabric;
  const connector2 = new ConnectorFabricEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Add correct foreign validator`, function(done) {
    this.timeout(5000);
    const name = `foreignValidatorTest`;
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    chai
      .expect(connector2.addForeignValidator(pubkey, name))
      .to.eventually.contain(`Successfully`)
      .notify(done);
  });

  it(`Add foreign validator with empty input`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector2.addForeignValidator())
      .be.rejectedWith(Error, `Failed to invoke chaincode`)
      .notify(done);
  });

  it(`Add foreign validator with wrong pubkey`, function(done) {
    this.timeout(5000);
    const name = `foreignValidator`;
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90wrbgbean.krg;w`;
    chai
      .expect(connector2.addForeignValidator(pubkey, name))
      .be.rejectedWith(Error, `Public key ie expected in compressed format`)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector2.options.url = 45;
    chai
      .expect(connector2.addForeignValidator())
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorFabricExample verifySignature`, function() {
  const options = config.blockchains.fabric;
  const connector3 = new ConnectorFabricEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Verify a correct signature`, function(done) {
    this.timeout(5000);
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`;
    const message = `Hello world!`;
    chai
      .expect(connector3.verifySignature(message, pubkey, signature))
      .to.eventually.equal(true)
      .notify(done);
  });

  it(`Verify a wrong signature`, function(done) {
    this.timeout(5000);
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`;
    const message = `Hello`;
    chai
      .expect(connector3.verifySignature(message, pubkey, signature))
      .to.eventually.equal(false)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`;
    const message = `Hello world!`;
    connector3.options.peerName = -1;
    chai
      .expect(connector3.verifySignature(message, pubkey, signature))
      .be.rejectedWith(TypeError, `invalid peerName provided: -1`)
      .notify(done);
  });
});

describe(`ConnectorFabricExample verifyMultisig`, function() {
  const options = config.blockchains.fabric;
  const connector4 = new ConnectorFabricEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`empty multisig object should throw`, function(done) {
    this.timeout(5000);
    const multisig1 = new Multisig();
    chai
      .expect(connector4.verifyMultisig(multisig1))
      .be.rejectedWith(ReferenceError, `Multisig message required to verify commitments`)
      .notify(done);
  });

  it(`one correct signature, one wrong signature`, function(done) {
    this.timeout(5000);
    const multisig2 = new Multisig(`Hello world!`);
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`;
    multisig2.addSignature(pubkey, signature);
    multisig2.addSignature(`fakePubKey`, `fakeSignature`);
    chai
      .expect(connector4.verifyMultisig(multisig2))
      .to.eventually.deep.equal([true, false])
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const multisig3 = new Multisig(`Hello world!`);
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`;
    connector4.options.peerName = -1;
    multisig3.addSignature(pubkey, signature);
    chai
      .expect(connector4.verifyMultisig(multisig3))
      .be.rejectedWith(TypeError, `invalid peerName provided: -1`)
      .notify(done);
  });
});

describe(`ConnectorFabricExample CreateAsset`, function() {
  const options = config.blockchains.fabric;
  const connector4 = new ConnectorFabricEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Creating a correctly formed asset`, function(done) {
    this.timeout(5000);
    const asset1 = {
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
    };
    chai
      .expect(connector4.createAsset(asset1))
      .to.eventually.include({ assetId: asset1.asset_id })
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const asset3 = {
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
    };
    connector4.options.url = -1;
    chai
      .expect(connector4.createAsset(asset3))
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorFabricExample LockAsset`, function() {
  this.timeout(5000);
  const options = config.blockchains.fabric;
  const connector5 = new ConnectorFabricEx(options);

  const asset4 = {
    asset_id: `Asset_DLT_1_${Date.now()}_lockAssetTest`,
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
  };

  before(async function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    } else {
      this.timeout(3000);
      await connector5.createAsset(asset4);
    }
  });

  it(`Missing parametters should throw`, function(done) {
    chai
      .expect(connector5.lockAsset(asset4.asset_id))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Locking an existing asset with correct params`, function(done) {
    this.timeout(3000);
    chai
      .expect(
        connector5.lockAsset(
          asset4.asset_id,
          `DLT300`,
          `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`
        )
      )
      .to.eventually.include({ assetId: asset4.asset_id, locked: true })
      .notify(done);
  });

  it(`Locking an already locked asset`, function(done) {
    this.timeout(3000);
    chai
      .expect(
        connector5.lockAsset(
          asset4.asset_id,
          `DLT300`,
          `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`
        )
      )
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector5.options.url = 45;
    chai
      .expect(
        connector5.lockAsset(
          asset4.asset_id,
          `DLT300`,
          `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`
        )
      )
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorFabricExample SetProperty`, function() {
  const options = config.blockchains.fabric;
  const connector6 = new ConnectorFabricEx(options);
  const asset5 = {
    asset_id: `Asset_DLT_1_${Date.now()}_setPropertyTest`,
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
  };

  before(async function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    } else {
      this.timeout(5000);
      await connector6.createAsset(asset5);
    }
  });

  it(`Missing parametters should throw`, function(done) {
    chai
      .expect(connector6.setProperty(asset5.asset_id))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Setting an existing property`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector6.setProperty(asset5.asset_id, `property1`, `new_value_property_1`))
      .to.eventually.include({ success: true })
      .notify(done);
  });

  it(`Setting an unknown property`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector6.setProperty(asset5.asset_id, `property4`, `new_value_property_4`))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector6.options.url = 45;
    chai
      .expect(connector6.setProperty(asset5.asset_id, `property4`, `new_value_property_4`))
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorFabricExample GetAsset`, function() {
  const options = config.blockchains.fabric;
  const connector7 = new ConnectorFabricEx(options);
  const asset6 = {
    asset_id: `Asset_DLT_1_${Date.now()}_getAssetTest`,
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
  };

  before(async function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    } else {
      this.timeout(5000);
      await connector7.createAsset(asset6);
    }
  });

  it(`get existing asset`, function(done) {
    this.timeout(5000);
    chai.expect(connector7.getAsset(asset6.asset_id)).to.eventually.fulfilled.notify(done);
  });

  it(`get unknown asset`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector7.getAsset(`Asset_DLT_1`))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector7.options.peerName = 45;
    chai
      .expect(connector7.getAsset(asset6.asset_id))
      .be.rejectedWith(TypeError, `invalid peerName provided: 45`)
      .notify(done);
  });
});

describe(`ConnectorFabricExample copyAsset`, function() {
  const options = config.blockchains.fabric;
  const connector3 = new ConnectorFabricEx(options);

  before(function() {
    this.timeout(5000);
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
    const name = `foreignValidatorCopyTest`;
    const pubkey = `03fd076032614ba907cf03108bfb37840fd7bf4057228d32a7323077bf70144db8`;
    return connector3.addForeignValidator(pubkey, name);
  });

  it(`Copy Asset with correct signature`, function(done) {
    this.skip(); // FixMe: Asset can be copied (created) only once.
    this.timeout(5000);
    const pubkey = '03fd076032614ba907cf03108bfb37840fd7bf4057228d32a7323077bf70144db8';
    const signature =
      'e16f7b7a4de297fb7c851d5d45275d1bae3d5ad838df2f0e11c8c24dd35e91061f16d9afb79cf93f000db248cbac8913df54d26927e18c5e28cd13ff487446eb';
    const msg =
      '{"asset_id":"Asset_DLT_1_1555594708716","dltID":"Accenture_DLT","origin":[{"originDLTId":"DLT100","originAssetId":"Asset_DLT100_1"},{"originDLTId":"DLT200","originAssetId":"Asset_DLT200_1"}],"property1":"value_property_1","property2":"value_property_2","locked":false,"targetDltId":"","receiverPK":""}';
    const signatures = { [pubkey]: signature };
    chai
      .expect(
        connector3
          .copyAsset({ numGood: 1, msg, signatures })
          .catch(err => (err.message.includes('Failed as entity already exists') ? err.message : 'Successfully'))
      )
      .to.eventually.contain(`Successfully`)
      .notify(done);
  });

  it(`Copy Asset with wrong signature`, function(done) {
    this.timeout(5000);
    const pubkey = '03fd076032614ba907cf03108bfb37840fd7bf4057228d32a7323077bf70144db8';
    const signature =
      'e16f7b7a4de297fb7c851d5d45275d1bae3d5ad838df2f0e11c8c24dd35e91061f16d9afb79cf93f000db248cbac8913df54d26927e18c5e28cd13ff487446eb';
    const msg =
      '{"asset_id":"Asset_DLT_1_1555594708716","dltID":"Accenture_DLT","origin":[{"originDLTId":"DLT100","originAssetId":"Asset_DLT100_1"},{"originDLTId":"DLT200","originAssetId":"Asset_DLT200_1"}],"property1":"value_property_1","property2":"value_property_2","locked":false,"targetDltId":"","receiverPK":""}';
    const signatures = { [pubkey]: signature };
    chai
      .expect(connector3.copyAsset({ numGood: 2, msg, signatures }))
      .be.rejectedWith(Error, `Good signatures are less then expected`)
      .notify(done);
  });
});
