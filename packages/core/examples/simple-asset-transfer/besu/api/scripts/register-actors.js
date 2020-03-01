const actorWrapper = require('../wrappers/actor.wrapper');
const { ACTORS } = require('../config/constants');
const logger = require('../utils/logger')('register');

async function registerActors() {
  logger.log('info', 'Registering actors... %j', ACTORS);
  await Promise.all(ACTORS.map(actor => actorWrapper.registerActor(actor)));
}

registerActors()
  .then(() => {
    logger.log('info', 'Done!');
    process.exit(0);
  })
  .catch(err => {
    logger.log('error', err.stack);
    process.exit(err.code || -1);
  });
