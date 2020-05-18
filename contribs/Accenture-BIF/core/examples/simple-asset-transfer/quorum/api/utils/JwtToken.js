const jwt = require('jsonwebtoken');
const config = require('../config/config');

class JwtToken {
  static get({ authorization }) {
    return authorization ? authorization.split(' ')[1] : '';
  }

  static sign(publicData) {
    return jwt.sign(publicData, config.jwtSecret, {
      expiresIn: '168h',
    });
  }

  static verify(token) {
    return new Promise(resolve => {
      jwt.verify(token, config.jwtSecret, (error, decoded) => resolve({ error, decoded }));
    });
  }
}

module.exports = JwtToken;
