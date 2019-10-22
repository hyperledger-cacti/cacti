/**
 @module Communication
*/

const zmq = require(`zeromq`);
const log4js = require(`log4js`);

const logger = log4js.getLogger(`fed-communication`);
logger.level = `DEBUG`;

module.exports.VALIDATOR_TYPE = {
  LEADER: `LEADER`,
  FOLLOWER: `FOLLOWER`,
};

module.exports.MSG_TYPE = {
  HEARTBEAT: `HEARTBEAT`,
  NEWLEADER: `NEWLEADER`,
  SIGN: `SIGN`,
};

module.exports.REQ_TYPE = {
  HEARTBEAT: `HEARTBEAT`,
  PUB_KEY: `PUB_KEY`,
  SIGN_REQ: `SIGN_REQ`,
};

/**
 * @param {string} validatorAddr
 * @param {object} request {type, data..}
 * @param {string} uponRes custom message triggered on validator`s response
 * @return {Promise<string>} validator`s response
 */
module.exports.sendRequestToValidator = function validatorRequest(validatorAddr, request, uponRes) {
  return new Promise((resolve, reject) => {
    try {
      const socket = zmq.socket(`req`);
      socket.connect(validatorAddr);

      const timeoutId = setTimeout(() => {
        socket.close();
        const timeoutError = new Error(`validatorRequest ${request.type} timeout`);
        return reject(timeoutError);
      }, 30000);

      const messageHandler = module.exports.ClientValidatorRequestMessage.bind(null, {
        logger,
        promise: { resolve, reject },
        socket,
        timeoutId,
        uponRes,
      });

      socket.on(`message`, messageHandler);

      return socket.send(JSON.stringify(request));
    } catch (error) {
      logger.error(error);
      return reject(error);
    }
  });
};

module.exports.ValidatorAsLeaderMessage = function AsLeaderMsg(msg) {
  const msgObj = JSON.parse(msg.toString());
  logger.debug(`Received message: ${msg.toString()}`);

  switch (msgObj.type) {
    case module.exports.MSG_TYPE.HEARTBEAT: {
      this.availableFollowers.push(msgObj);
      this.requestSocket.send(`OK`);
      break;
    }
    case module.exports.MSG_TYPE.SIGN: {
      this.currentMultisig.addSignature(msgObj.pubKey, msgObj.signature);
      this.requestSocket.send(`OK`);
      break;
    }
    default: {
      logger.debug(`Unkown message type`);
      this.requestSocket.send(`Unkown message type`);
    }
  }
};

module.exports.ValidatorAsFollowerMessage = async function AsFollowerMsg(key, content) {
  const type = key.toString();
  const message = JSON.parse(content.toString());
  logger.debug(`Received a '${type}' message: ${JSON.stringify(message)}`);

  switch (type) {
    case module.exports.MSG_TYPE.HEARTBEAT: {
      const heartbeat = {
        type: module.exports.MSG_TYPE.HEARTBEAT,
        pub: this.pubAddr,
        rep: this.repAddr,
        clientRep: this.clientRepAddr,
      };
      try {
        module.exports.sendRequestToValidator(this.leaderRepAddr, heartbeat, `Received ACK from the leader`);
      } catch (error) {
        logger.error(`Missed a heartbeat: ${error}`);
      }
      break;
    }
    case module.exports.MSG_TYPE.NEWLEADER:
      logger.debug(
        `New Leader elected : 
        ${message.pub},
        ${message.rep},
        ${message.clientRep}`
      );
      this.switchToNewLeader(message);
      break;
    case module.exports.MSG_TYPE.SIGN: {
      logger.debug(`processing signature request of ${message.data} received from the leader ...`);
      try {
        const result = await this.dataSign(`ASSET_ID`, message.data, message.targetDLTType);
        if (result) {
          const signature = {
            type: message.type,
            signature: result.signature,
            pubKey: this.pubKey,
          };
          const sendTo = message.requester || this.leaderRepAddr;
          logger.debug(
            `Sending signature 
            ${JSON.stringify(result.signature)} for 
            ${result.data} to
            ${sendTo}`
          );
          module.exports.sendRequestToValidator(sendTo, signature, `Received ACK from ${sendTo}`);
        } else {
          throw new Error(`Data to sign is invalid`);
        }
      } catch (error) {
        logger.error(`Could not send signature to ${message.requester}: ${error}`);
      }
      break;
    }
    default:
      logger.error(`Unkown message type '${type}'. Message is being ignored.`);
  }
};

module.exports.ValidatorClientServerMessage = async function ClientServerMsg(msg) {
  const request = JSON.parse(msg.toString());

  switch (request.type) {
    case module.exports.REQ_TYPE.HEARTBEAT:
      logger.info(`Heartbeat request received from federation client`);
      this.clientRepSocket.send(`ALIVE`);
      break;
    case module.exports.REQ_TYPE.PUB_KEY:
      logger.info(`Public key request received from federation client`);
      this.clientRepSocket.send(this.pubKey);
      break;
    case module.exports.REQ_TYPE.SIGN_REQ:
      logger.info(`Signature request received from federation client`);
      if (this.type === module.exports.VALIDATOR_TYPE.FOLLOWER) {
        try {
          const signatures = await module.exports.sendRequestToValidator(
            this.leaderClientRepAddr,
            request,
            `Leader finished the job`
          );
          this.clientRepSocket.send(signatures);
        } catch (error) {
          logger.error(error);
          this.clientRepSocket.send(`Error connecting to leader: ${error}`);
        }
      } else {
        // Get followers signatures
        try {
          const followerSignature = await this.broadcastSignRequest(`ASSET_ID`, request.data, request.targetDLTType);
          if (!followerSignature) {
            this.clientRepSocket.send(`Sign request broadcast exited unexpectently: ${followerSignature}`);
          } else {
            const rep = {
              type: module.exports.MSG_TYPE.SIGN,
              signatures: this.currentMultisig,
            };
            this.clientRepSocket.send(JSON.stringify(rep));
          }
        } catch (error) {
          logger.error(error);
          this.clientRepSocket.send(`Error while gathering signatures: ${error}`);
        }
      }
      break;
    default:
      logger.error(`Unknown request type ${request.type}`);
      this.clientRepSocket.send(`Unknown request type ${request.type}`);
      break;
  }
};

// base contains variables from the calling function
module.exports.ClientValidatorRequestMessage = function validatorRequestMsg(base, msg) {
  base.logger.info(base.uponRes || `validatorRequest completed (w/o response-completed callback to call)`);
  clearTimeout(base.timeoutId);
  base.socket.close();

  const strMsg = msg.toString();
  if (strMsg.toLowerCase().includes(`error`)) {
    return base.promise.reject(strMsg);
  }
  return base.promise.resolve(strMsg);
};

// base contains variables from the calling function
module.exports.ClientIsValidatorAliveMessage = function isValidatorAliveMsg(base, msg) {
  clearTimeout(base.timeoutId);
  base.socket.close();
  if (msg.toString() === `ALIVE`) {
    base.logger.debug(`${base.validatorAddr} is alive`);
    return base.promise.resolve(true);
  }
  base.logger.debug(`${base.validatorAddr} is responsive but behaves unexpectedly`);
  return base.promise.resolve(false);
};
