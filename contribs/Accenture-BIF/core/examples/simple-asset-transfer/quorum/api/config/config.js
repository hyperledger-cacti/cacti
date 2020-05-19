const Joi = require('joi');

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();
//
// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow(['development', 'production', 'test', 'provision'])
    .default('production'),
  APP_HOST_LINUX: Joi.string()
    .required()
    .description('Application host linux'),
  APP_HOST_DARWIN: Joi.string()
    .required()
    .description('Application host Mac'),
  APP_HOST_WIN32: Joi.string()
    .required()
    .description('Application host win32'),
  APP_PORT: Joi.number().required(),
  APP_SESSION_SECRET: Joi.string()
    .required()
    .description('Application session secret'),

  SOLIDITY_CONTRACTS_FOLDER: Joi.string()
    .description('Smart contracts source code folder')
    .default('../contracts'),
  SOLIDITY_BUILD_FOLDER: Joi.string()
    .description('Smart contracts build folder')
    .default('build'),

  WEB3_HOST_LINUX: Joi.string()
    .required()
    .description('Quorum host linux'),
  WEB3_HOST_DARWIN: Joi.string()
    .required()
    .description('Quorum host Mac'),
  WEB3_HOST_WIN32: Joi.string()
    .required()
    .description('Quorum host win32'),
  WEB3_RPC_PORT: Joi.number().required(),
  WEB3_ETH_KEY: Joi.string()
    .required()
    .description('Ethereum key'),
  WEB3_CONST_KEY: Joi.string()
    .required()
    .description('Constellation key'),

  JWT_SECRET: Joi.string()
    .required()
    .description('JWT Secret required to sign'),
  USER_USERNAME: Joi.string().required(),
  USER_PASSWORD: Joi.string().required(),
  CLIENT_BUILD: Joi.string().required(),
})
  .unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,

  app: {
    host: {
      linux: envVars.APP_HOST_LINUX,
      darwin: envVars.APP_HOST_DARWIN,
      win32: envVars.APP_HOST_WIN32,
    },
    port: envVars.APP_PORT,
    sessionSecret: envVars.APP_SESSION_SECRET,
  },

  solidity: {
    contractsFolder: envVars.SOLIDITY_CONTRACTS_FOLDER,
    buildFolder: envVars.SOLIDITY_BUILD_FOLDER,
  },

  web3: {
    host: {
      linux: envVars.WEB3_HOST_LINUX,
      darwin: envVars.WEB3_HOST_DARWIN,
      win32: envVars.WEB3_HOST_WIN32,
    },
    port: envVars.WEB3_PORT,
    rpcPort: envVars.WEB3_RPC_PORT,
    ethKey: envVars.WEB3_ETH_KEY,
    constKey: envVars.WEB3_CONST_KEY,
  },

  jwtSecret: envVars.JWT_SECRET,
  user: {
    username: envVars.USER_USERNAME,
    password: envVars.USER_PASSWORD,
  },

  clientBuild: envVars.CLIENT_BUILD,
};

module.exports = config;
