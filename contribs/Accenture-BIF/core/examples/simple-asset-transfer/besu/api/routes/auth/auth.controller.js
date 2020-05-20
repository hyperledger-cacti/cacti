const httpStatus = require('http-status');
const JwtToken = require('../../utils/JwtToken');
const APIError = require('../../utils/APIError');
const config = require('../../config/config');

/**
 * Returns jwt token if valid username and password is provided
 * @property {string} req.body.username - The username of user.
 * @property {string} req.body.password - The password of user.
 * @returns {*}
 */
async function login(req, res, next) {
  const { username, password } = req.body;

  const isUserEqual = username === config.user.username && password === config.user.password;
  if (isUserEqual) {
    const token = JwtToken.sign(config.user);
    return res.json({ token });
  }

  // Authentication error handler
  const err = new APIError('Authentication error', httpStatus.UNAUTHORIZED, true);
  return next(err);
}

/**
 * This is a protected route. Will return random number only if jwt token is provided in header.
 * @param req
 * @param res
 * @returns {*}
 */
function getRandomNumber(req, res) {
  // req.user is assigned by jwt middleware if valid token is provided
  return res.json({
    user: req.user,
    num: Math.random() * 100,
  });
}

module.exports = { login, getRandomNumber };
