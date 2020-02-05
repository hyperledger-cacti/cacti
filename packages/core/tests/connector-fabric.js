/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint max-len: "off" */
/* eslint func-names: ["error", "never"] */
const chai = require(`chai`);
const cp = require(`chai-as-promised`);

const Connector = require(`../src/plugins/Connector`);
const config = require(`./config`);
const Multisig = require(`../src/Multisig`);

chai.use(cp);

describe(`ConnectorFabric Constructor`, function() {
  it(`empty instance should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC();
      })
      .to.throw(ReferenceError);
  });

  it(`instance lacking params should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://10.0.0.0:4000`,
        });
      })
      .to.throw(ReferenceError);
  });

  it(`Invalid url should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://:6000`,
        });
      })
      .to.throw(TypeError);
  });

  it(`Invalid port should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://127.0.0.1:23`,
        });
      })
      .to.throw(RangeError);
  });

  it(`Non provided Fabric-specific param should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://127.0.0.1:4000`,
        });
      })
      .to.throw(ReferenceError);
  });

  it(`Wrong orgName should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://127.0.0.1:4000`,
          username: `smith`,
          orgName: 45,
        });
      })
      .to.throw(TypeError);
  });

  it(`Wrong peer should throw`, function() {
    chai
      .expect(() => {
        new Connector.FABRIC({
          url: `http://127.0.0.1:4000`,
          username: `smith`,
          orgName: `org2`,
          peerName: 3,
        });
      })
      .to.throw(TypeError);
  });
});

describe(`ConnectorFabric getAccessToken`, function() {
  const options = config.blockchains.fabric;
  const connector1 = new Connector.FABRIC(options);

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

describe(`ConnectorFabric addForeignValidator`, function() {
  const options = config.blockchains.fabric;
  const connector2 = new Connector.FABRIC(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Add correct foreign validator`, function(done) {
    this.timeout(3000);
    chai
      .expect(
        connector2.addForeignValidator(
          `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
          `foreignValidatorTest`
        )
      )
      .to.eventually.contain(`Successfully`)
      .notify(done);
  });

  it(`Add foreign validator with empty input`, function(done) {
    chai
      .expect(connector2.addForeignValidator())
      .be.rejectedWith(Error, `Failed to invoke chaincode`)
      .notify(done);
  });

  it(`Add foreign validator with wrong pubkey`, function(done) {
    chai
      .expect(
        connector2.addForeignValidator(
          `036aaf98c8c07ccef29f43528b8682407b1ddb9e9c42c427c751a3ea151cfabd90flkng`,
          `foreignValidator`
        )
      )
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

describe(`ConnectorFabric verifySignature`, function() {
  const options = config.blockchains.fabric;
  const connector3 = new Connector.FABRIC(options);

  before(function() {
    if (!process.env.BLOCKCHAIN) {
      this.skip();
    }
  });

  it(`Verify a correct signature`, function(done) {
    const message = `Hello world!`;
    chai
      .expect(
        connector3.verifySignature(
          message,
          `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
          `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`
        )
      )
      .to.eventually.equal(true)
      .notify(done);
  });

  it(`Verify a wrong signature`, function(done) {
    const message = `Hello`;
    chai
      .expect(
        connector3.verifySignature(
          message,
          `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
          `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`
        )
      )
      .to.eventually.equal(false)
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const message = `Hello world!`;
    connector3.options.peerName = -1;
    chai
      .expect(
        connector3.verifySignature(
          message,
          `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
          `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`
        )
      )
      .be.rejectedWith(TypeError, `invalid peerName provided: -1`)
      .notify(done);
  });
});

describe(`ConnectorFabric verifyMultisig`, function() {
  const options = config.blockchains.fabric;
  const connector4 = new Connector.FABRIC(options);

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
    const multisig2 = new Multisig(`Hello world!`);
    multisig2.addSignature(
      `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
      `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`
    );
    multisig2.addSignature(`fakePubKey`, `fakeSignature`);
    chai
      .expect(connector4.verifyMultisig(multisig2))
      .to.eventually.deep.equal([true, false])
      .notify(done);
  });

  it(`Wrong param added on the fly should throw`, function(done) {
    const multisig3 = new Multisig(`Hello world!`);
    connector4.options.peerName = -1;
    multisig3.addSignature(
      `036aaf98c8c07ccef29f43528b8682407b1ddb9e9ca4c427c751a3ea151cfabd90`,
      `82d8cb179cf30fe6eda365f8cd946711a019e42df0c119671fe6de7e94e591ff42d1b26a14b14f294360f82e376f1bbce92d839f984a2f65bd8bc3918354db8b`
    );
    chai
      .expect(connector4.verifyMultisig(multisig3))
      .be.rejectedWith(TypeError, `invalid peerName provided: -1`)
      .notify(done);
  });
});
