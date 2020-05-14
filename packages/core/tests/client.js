/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint max-length: "off" */
/* eslint func-names: ["error", "never"] */

const chai = require(`chai`);
const zmq = require(`zeromq`);

const Client = require(`../src/Client`);
const Connector = require(`../src/plugins/Connector`);
const conf = require(`./config`);
const Validator = require(`../src/Validator`);
const fedcom = require(`../src/federation-communication`);

describe(`Client module`, function() {
  describe(`Constructor`, function() {
    it(`List of validators should be accessible`, function() {
      const options = {
        validators: [`tcp://127.0.0.1:7100`, `tcp://127.0.0.1:7101`],
      };
      const client = new Client(options);
      chai.expect(client.options.validators).to.deep.equal(options.validators);
    });
  });

  // eslint-disable-next-line
  describe(`Look for an alive validator`, function() {
    // Looking for an alive validator can take 3*3000 ms
    // So we`re setting a bigger timeout
    this.timeout(25000);

    const noValidatorOptions = {
      validators: [`tcp://127.0.0.1:7101`, `tcp://127.0.0.1:7102`],
    };
    const firstValidatorOptions = {
      validators: [`tcp://127.0.0.1:7100`, `tcp://127.0.0.1:7101`, `tcp://127.0.0.1:7102`],
    };
    const lastValidatorOptions = {
      validators: [`tcp://127.0.0.1:7102`, `tcp://127.0.0.1:7101`, `tcp://127.0.0.1:7100`],
    };

    const clientNoValidatorRunning = new Client(noValidatorOptions);
    const clientFirstValidatorRunning = new Client(firstValidatorOptions);
    const clientLastValidatorRunning = new Client(lastValidatorOptions);
    const runningValidatorAddr = `tcp://127.0.0.1:7100`;
    const deadValidatorAddr = `tcp://127.0.0.1:7101`;

    let rep;
    before(function() {
      rep = zmq.socket(`rep`);
      rep.bindSync(runningValidatorAddr);
      rep.on(`message`, msg => {
        const request = JSON.parse(msg.toString());
        if (request.type === fedcom.REQ_TYPE.HEARTBEAT) {
          rep.send(`ALIVE`);
        }
      });
    });

    after(function() {
      rep.close();
    });

    it(`Testing that the validator mock returns "ALIVE" when asked`, async function() {
      const request = {
        msg: `debug`,
        type: fedcom.REQ_TYPE.HEARTBEAT,
      };
      const isAlive = await Client.validatorRequest(runningValidatorAddr, request);
      chai.expect(isAlive).to.equal(`ALIVE`);
    });

    it(`Testing if mock validator is alive`, async function() {
      const isAlive = await Client.isValidatorAlive(runningValidatorAddr);
      chai.expect(isAlive).to.equal(true);
    });

    it(`Testing if a dead address is alive`, async function() {
      const isAlive = await Client.isValidatorAlive(deadValidatorAddr);
      chai.expect(isAlive).to.equal(false);
    });

    it(`First validator in the set of known validators is alive`, async function() {
      const aliveValidatorAddr = await clientFirstValidatorRunning.findValidator();
      chai.expect(aliveValidatorAddr).to.equal(runningValidatorAddr);
    });

    it(`Last validator in the set of known validators is alive`, async function() {
      const aliveValidatorAddr = await clientLastValidatorRunning.findValidator();
      chai.expect(aliveValidatorAddr).to.equal(runningValidatorAddr);
    });

    it(`Try to connect to known validators over and over again when none is alive`, async function() {
      const findValidator = clientNoValidatorRunning.findValidator();

      setTimeout(() => {
        noValidatorOptions.validators.push(runningValidatorAddr);
      }, 9500);

      const aliveValidatorAddr = await findValidator;
      chai.expect(aliveValidatorAddr).to.equal(runningValidatorAddr);
    });
  });

  // eslint-disable-next-line
  describe(`Asking for signatures`, function() {
    let validator1;
    let validator2;
    const clientRepAddr1 = `tcp://127.0.0.1:7103`;

    this.timeout(50000);

    before(function() {
      // Replace dataSign method by a method that returns {data: `some data`, signature: dataSign(`some data`)}
      // Replace dataSign method by a method that returns {data: `some data`, signature: dataSign(`some data`)}
      const content = {
        data: `some data`,
        signature: `31a5012bcdaf27b75d34c78d643d262c8b01db477dc65f308189866cfac0f82461362e3b00039007c2f1da164de7aeeba2f491711cde191957d51cc408eb1787`, // eslint-disable-line
      };
      Validator.prototype.dataSign = async () => content;

      const validatorKeys = {
        privKey: `9528304a9d1f091131234e7bbbb69ad2756cf6628be41b6f24433bf947665294`,
        pubKey: `031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`,
      };
      const validatorOptions1 = {
        etcdHosts: ['http://localhost:2379'],
        ...validatorKeys,
        type: fedcom.VALIDATOR_TYPE.LEADER,
        clientRepAddr: `tcp://127.0.0.1:7103`,
        pubAddr: `tcp://127.0.0.1:3103`,
        repAddr: `tcp://127.0.0.1:5103`,
        dlType: `FABRIC`,
      };
      const connector1 = new Connector.FABRIC(conf.blockchains.fabric);

      // Start a validator as leader
      validator1 = new Validator(connector1, validatorOptions1);
      validator1.start();

      // self promote to leader manually for test since there's no etd cluster, we need to fake/rig the election
      validator1.switchToNewLeader(validator1.selfNodeInfo);

      const validatorOptions2 = {
        etcdHosts: ['http://localhost:2379'],
        ...validatorKeys,
        type: fedcom.VALIDATOR_TYPE.FOLLOWER,
        leaderClientRepAddr: `tcp://127.0.0.1:7103`,
        leaderPubAddr: `tcp://127.0.0.1:3103`,
        leaderRepAddr: `tcp://127.0.0.1:5103`,
        clientRepAddr: `tcp://127.0.0.1:7104`,
        pubAddr: `tcp://127.0.0.1:3104`,
        repAddr: `tcp://127.0.0.1:5104`,
        dlType: `FABRIC`,
      };
      const connector2 = new Connector.FABRIC(conf.blockchains.fabric);

      // Start a validator as follower
      validator2 = new Validator(connector2, validatorOptions2);
      validator2.start();
    });

    after(function() {
      validator1.stop();
      validator2.stop();
    });

    it(`Asking validator for public key`, async function() {
      const pubKey = await Client.askForPubKey(clientRepAddr1);
      chai.expect(pubKey.toString()).to.equal(`031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b`);
    });

    it(`Asking a validator for signatures`, async function() {
      const options = {
        validators: [clientRepAddr1],
      };
      const client = new Client(options);
      const msg = `some data`;

      const signatures = await client.askForSignatures(msg, `FABRIC`);

      // Getting a list of signatures
      chai.expect(signatures).to.deep.equal({
        msg: `some data`,
        formattedMsg: `6cba8c69b5f9084d8eefd5dd7cf71ed5469f5bbb9d8446533ebe4beccdfb3ce9`,
        signatures: {
          '031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b':
            '31a5012bcdaf27b75d34c78d643d262c8b01db477dc65f308189866cfac0f82461362e3b00039007c2f1da164de7aeeba2f491711cde191957d51cc408eb1787', // eslint-disable-line
        },
      });
    });
  });
});
