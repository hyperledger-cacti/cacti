const {
  INVALID,
  ACTIVE,
  REFUNDED,
  WITHDRAWN,
  EXPIRED,
} = require("./constants.js");

// Status codes to string values
const statuses = [INVALID, ACTIVE, REFUNDED, WITHDRAWN, EXPIRED];

module.exports = statuses;
