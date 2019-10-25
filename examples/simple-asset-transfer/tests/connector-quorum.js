/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint max-len: "off" */
/* eslint func-names: ["error", "never"] */
const chai = require(`chai`);
const cp = require(`chai-as-promised`);
const { randomBytes } = require(`crypto`);
const secp256k1 = require(`secp256k1`);

const ConnectorQuorumEx = require(`../quorum/connector`);
const config = require(`./config`);
const { Multisig } = require(`@hyperledger/blockchain-integration-framework`);

chai.use(cp);

describe(`ConnectorQuorumExample Constructor`, function() {
  it(`empty instance should throw`, function() {
    chai
      .expect(function() {
        new ConnectorQuorumEx();
      })
      .to.throw(ReferenceError);
  });

  it(`instance lacking params should throw`, function() {
    const options = {
      url: `http://10.0.0.0:4000`,
    };
    chai
      .expect(function() {
        new ConnectorQuorumEx(options);
      })
      .to.throw(ReferenceError);
  });

  it(`Invalid url should throw`, function() {
    const options = {
      url: `http://:6000`,
    };
    chai
      .expect(function() {
        new ConnectorQuorumEx(options);
      })
      .to.throw(TypeError);
  });

  it(`Invalid port should throw`, function() {
    const options = {
      url: `http://127.0.0.1:23`,
    };
    chai
      .expect(function() {
        new ConnectorQuorumEx(options);
      })
      .to.throw(RangeError);
  });

  it(`Non provided Quorum-specific param should throw`, function() {
    const options = {
      url: `http://127.0.0.1:4000`,
    };
    chai
      .expect(function() {
        new ConnectorQuorumEx(options);
      })
      .to.throw(ReferenceError);
  });

  it(`Invalid  password should throw`, function() {
    const options = {
      url: `http://127.0.0.1:4000`,
      username: `smith`,
      password: 45,
    };
    chai
      .expect(function() {
        new ConnectorQuorumEx(options);
      })
      .to.throw(TypeError, `invalid password provided: 45`);
  });
});

describe(`ConnectorQuorumExample getAccessToken`, function() {
  const options = config.blockchains.quorum;
  const connector1 = new ConnectorQuorumEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`getAccessToken with correct credentials`, function(done) {
    chai.expect(connector1.getAccessToken()).to.eventually.be.fulfilled.notify(done);
  });

  it(`getAccessToken with wrong credentials`, function(done) {
    connector1.options.password = `fakePassword`;
    chai
      .expect(connector1.getAccessToken())
      .be.rejectedWith(Error, `Authentication error`)
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

describe(`ConnectorQuorumExample addForeignValidator`, function() {
  const options = config.blockchains.quorum;
  const connector2 = new ConnectorQuorumEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Add correct foreign validator`, function(done) {
    this.timeout(5000);

    let privkey;
    do {
      privkey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privkey));
    const pubkey = secp256k1.publicKeyCreate(privkey).toString(`hex`);
    const name = `foreignValidator1`;
    chai
      .expect(connector2.addForeignValidator(pubkey, name))
      .to.eventually.have.all.keys([`name`, `pubKey`, `type`, `ethAddress`])
      .notify(done);
  });

  it(`Add foreign validator with empty input`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector2.addForeignValidator())
      .be.rejectedWith(Error, `400`)
      .notify(done);
  });

  it(`Add foreign validator with wrong key format`, function(done) {
    this.timeout(5000);
    const name = `foreignValidator2`;
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90wrbgbean.krg;w`;
    chai
      .expect(connector2.addForeignValidator(pubkey, name))
      .be.rejectedWith(Error, `500`)
      .notify(done);
  });

  it(`Add foreign validator with fakeKey`, function(done) {
    this.timeout(5000);
    const name = `foreignValidator3`;
    const pubkey = `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`;
    chai
      .expect(connector2.addForeignValidator(pubkey, name))
      .be.rejectedWith(Error, `500`)
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

describe(`ConnectorQuorumExample verifySignature`, function() {
  const options = config.blockchains.quorum;
  const connector3 = new ConnectorQuorumEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Verify a correct signature`, function(done) {
    this.timeout(5000);
    // const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `0xc81acfc729bc5527a0a9187ba88a7b495100d018cb2814877a9bdbf058daf25f59cf38cbd6ea7237967c8c31799af3afc3614216f565af451a80c395399ca8031b`;
    const message = `Hello world!`;
    chai
      .expect(connector3.verifySignature(message, signature))
      .to.eventually.deep.equal([true])
      .notify(done);
  });

  it(`Verify a wrong signature`, function(done) {
    this.timeout(5000);
    // const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `0xc81acfc729bc5527a0a9187ba88a7b495100d018cb2814877a9bdbf058daf25f59cf38cbd6ea7237967c8c31799af3afc3614216f565af451a80c395399ca8031b`;
    const message = `Hello`;
    chai
      .expect(connector3.verifySignature(message, signature))
      .to.eventually.deep.equal([false])
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    // const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `0xc81acfc729bc5527a0a9187ba88a7b495100d018cb2814877a9bdbf058daf25f59cf38cbd6ea7237967c8c31799af3afc3614216f565af451a80c395399ca8031b`;
    const message = `Hello world!`;
    connector3.options.url = -1;
    chai
      .expect(connector3.verifySignature(message, signature))
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorQuorumExample verifyMultisig`, function() {
  const options = config.blockchains.quorum;
  const connector4 = new ConnectorQuorumEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`empty multisig object should throw`, function(done) {
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
    const signature = `0xc81acfc729bc5527a0a9187ba88a7b495100d018cb2814877a9bdbf058daf25f59cf38cbd6ea7237967c8c31799af3afc3614216f565af451a80c395399ca8031b`;
    const fakePubKey = `01234`;
    const fakeSignature = `0x1234`;
    multisig2.addSignature(pubkey, signature);
    multisig2.addSignature(fakePubKey, fakeSignature);
    chai
      .expect(connector4.verifyMultisig(multisig2))
      .to.eventually.deep.equal([true, false])
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const multisig3 = new Multisig(`Hello world!`);
    const pubkey = `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`;
    const signature = `0xc81acfc729bc5527a0a9187ba88a7b495100d018cb2814877a9bdbf058daf25f59cf38cbd6ea7237967c8c31799af3afc3614216f565af451a80c395399ca8031b`;
    connector4.options.password = undefined;
    multisig3.addSignature(pubkey, signature);
    chai
      .expect(connector4.verifyMultisig(multisig3))
      .be.rejectedWith(ReferenceError)
      .notify(done);
  });
});

describe(`ConnectorQuorumExample CreateAsset`, function() {
  const options = config.blockchains.quorum;
  const connector4 = new ConnectorQuorumEx(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Creating a correctly formed asset`, function(done) {
    this.timeout(5000);
    const asset1 = {
      assetId: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          originDLTId: `DLT100`,
          originAssetId: `Asset_DLT100_1`,
        },
      ],
      properties: {
        property1: `value_property_1`,
        property2: `value_property_2`,
      },
    };
    chai.expect(connector4.createAsset(asset1)).to.eventually.fulfilled.notify(done);
  });

  it(`Creating a malformed asset`, function(done) {
    this.timeout(5000);
    const asset2 = {};
    chai
      .expect(connector4.createAsset(asset2))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const asset3 = {
      assetId: `Asset_DLT_1_${Date.now()}`,
      origin: [
        {
          originDLTId: `DLT100`,
          originAssetId: `Asset_DLT100_3`,
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

describe(`ConnectorQuorumExample LockAsset`, function() {
  const options = config.blockchains.quorum;
  const connector5 = new ConnectorQuorumEx(options);

  const asset4 = {
    assetId: `Asset_DLT_1_${Date.now()}_lockAssetTest`,
    origin: [
      {
        originDLTId: `DLT100`,
        originAssetId: `Asset_DLT100_4`,
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
      await connector5.createAsset(asset4);
    }
  });

  it(`Missing parametters should throw`, function(done) {
    chai
      .expect(connector5.lockAsset(asset4.assetId))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Locking an existing asset with correct params`, function(done) {
    this.timeout(5000);
    chai
      .expect(
        connector5.lockAsset(
          asset4.assetId,
          `DLT300`,
          `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`
        )
      )
      .to.eventually.fulfilled.notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector5.options.url = 45;
    chai
      .expect(
        connector5.lockAsset(
          asset4.assetId,
          `DLT300`,
          `036aaf98c8c07ccef29f43528b8682417b1ddb9e9ca4c427c751a3ea151cfabd90`
        )
      )
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorQuorumExample SetProperty`, function() {
  const options = config.blockchains.quorum;
  const connector6 = new ConnectorQuorumEx(options);
  const asset5 = {
    assetId: `Asset_DLT_1_${Date.now()}_setPropertyTest`,
    origin: [
      {
        originDLTId: `DLT100`,
        originAssetId: `Asset_DLT100_5`,
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
    this.timeout(5000);
    chai
      .expect(connector6.setProperty(asset5.assetId))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Setting an existing property`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector6.setProperty(asset5.assetId, `property1`, `new_value_property_1`))
      .to.eventually.fulfilled.notify(done);
  });

  it(`Setting an unknown property`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector6.setProperty(asset5.assetId, `property4`, `new_value_property_4`))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector6.url = 45;
    chai
      .expect(connector6.setProperty(asset5.assetId, `property4`, `new_value_property_4`))
      .be.rejectedWith(TypeError)
      .notify(done);
  });
});

describe(`ConnectorQuorumExample GetAsset`, function() {
  const options = config.blockchains.quorum;
  const connector7 = new ConnectorQuorumEx(options);
  const asset6 = {
    assetId: `Asset_DLT_1_${Date.now()}_getAssetTest`,
    origin: [
      {
        originDLTId: `DLT100`,
        originAssetId: `Asset_DLT100_6`,
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
    chai.expect(connector7.getAsset(asset6.assetId)).to.eventually.fulfilled.notify(done);
  });

  it(`get unknown asset`, function(done) {
    this.timeout(5000);
    chai
      .expect(connector7.getAsset(`Asset_DLT_1`))
      .be.rejectedWith(Error)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    connector7.options.password = undefined;
    chai
      .expect(connector7.getAsset(asset6.assetId))
      .be.rejectedWith(ReferenceError)
      .notify(done);
  });
});
