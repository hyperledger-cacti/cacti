/* eslint-disable @typescript-eslint/no-var-requires */
const environment = process.env.ENVIRONMENT || "development";
const config = require("../knexfile.js")[environment];
module.exports = require("knex")(config);
