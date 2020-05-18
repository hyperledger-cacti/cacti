/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint func-names: ["error", "never"] */
const chai = require(`chai`);
const { randomBytes } = require(`crypto`);
const secp256k1 = require(`secp256k1`);

const cryptoUtils = require(`../src/crypto-utils`);
const Multisig = require(`../src/Multisig`);

describe(`Multisig module`, function() {
  const keypairs = [];
  const msg = `hello_world`;
  const formattedMsg = cryptoUtils.dataHash(msg);

  before(function() {
    for (let i = 1; i <= 3; i += 1) {
      let privkey;
      do {
        privkey = randomBytes(32);
      } while (!secp256k1.privateKeyVerify(privkey));
      const pubkey = secp256k1.publicKeyCreate(privkey).toString(`hex`);
      privkey = privkey.toString(`hex`);
      keypairs.push({ privkey, pubkey });
    }
  });

  describe(`Constructor`, function() {
    it(`Create a Multisig empty message`, function() {
      const emptyMultisig = new Multisig();
      chai.expect(emptyMultisig.msg).to.equal(null);
      chai.expect(emptyMultisig.msg).to.equal(null);
    });

    it(`Create a Multisig messsage`, function() {
      const helloWorldMultisig = new Multisig(msg);
      chai.expect(helloWorldMultisig.msg).to.equal(msg);
      chai.expect(helloWorldMultisig.formattedMsg).to.deep.equal(cryptoUtils.dataHash(msg));
    });
  });

  describe(`Signature`, function() {
    describe(`Add signatures`, function() {
      it(`Add a signature to an empty message`, function() {
        const emptyMultisig = new Multisig();
        chai.expect(emptyMultisig.addSignature).to.throw(TypeError);
        chai.expect(emptyMultisig.signatures).to.deep.equal({});
      });

      it(`Add a wrong signature`, function() {
        const helloWorldMultisig = new Multisig(`hello_world`);
        chai.expect(helloWorldMultisig.addSignature).to.throw(TypeError);
        chai.expect(helloWorldMultisig.signatures).to.deep.equal({});
      });

      it(`Add a correct signature from follower1`, function() {
        const helloWorldMultisig = new Multisig(msg);
        const signedMsg = cryptoUtils.signMsg(formattedMsg, keypairs[0].privkey);
        helloWorldMultisig.addSignature(keypairs[0].pubkey, signedMsg);
        chai.expect(helloWorldMultisig.signatures[keypairs[0].pubkey]).to.equal(signedMsg);
      });

      it(`Add 3 correct signatures from follower1-3`, function() {
        const helloWorldMultisig = new Multisig(msg);
        for (let i = 0; i < 3; i += 1) {
          const signedMsg = cryptoUtils.signMsg(formattedMsg, keypairs[i].privkey);
          helloWorldMultisig.addSignature(keypairs[i].pubkey, signedMsg);
          chai.expect(helloWorldMultisig.signatures[keypairs[i].pubkey]).to.equal(signedMsg);
        }
      });

      it(`Add the same signature twice`, function() {
        const helloWorldMultisig = new Multisig(msg);
        const signedMsg = cryptoUtils.signMsg(formattedMsg, keypairs[0].privkey);
        helloWorldMultisig.addSignature(keypairs[0].pubkey, signedMsg);
        helloWorldMultisig.addSignature(keypairs[0].pubkey, signedMsg);
        chai.expect(helloWorldMultisig.signatures[keypairs[0].pubkey]).to.equal(signedMsg);
      });
    });

    describe(`Verify signatures`, function() {
      it(`verify 3 required signatures`, function() {
        const requiredPubKey = [];
        const helloWorldMultisig = new Multisig(msg);
        for (let i = 0; i < 3; i += 1) {
          requiredPubKey.push(keypairs[i].pubkey);
          const signedMsg = cryptoUtils.signMsg(formattedMsg, keypairs[i].privkey);
          helloWorldMultisig.addSignature(keypairs[i].pubkey, signedMsg);
        }
        const verifyResults = helloWorldMultisig.verifyRequiredSignature(requiredPubKey);
        chai.expect(verifyResults).to.deep.equal([true, true, true]);
      });

      it(`verify for 3 signatures while 2 are provided`, function() {
        const requiredPubKey = [];
        const helloWorldMultisig = new Multisig(msg);
        for (let i = 0; i < 2; i += 1) {
          requiredPubKey.push(keypairs[i].pubkey);
          const signedMsg = cryptoUtils.signMsg(formattedMsg, keypairs[i].privkey);
          helloWorldMultisig.addSignature(keypairs[i].pubkey, signedMsg);
        }
        requiredPubKey.push(keypairs[2]);
        const verifyResults = helloWorldMultisig.verifyRequiredSignature(requiredPubKey);
        chai.expect(verifyResults).to.deep.equal([true, true, false]);
      });
    });
  });
});
