const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const app = require('../../index');
const config = require('../../config/config');
const { API } = require('../../config/constants');

const { expect } = chai;

chai.config.includeStack = true;

describe('## Misc', () => {
  let jwtToken;

  const user = {
    username: config.user.username,
    password: config.user.password,
  };

  describe('# POST /api/auth/login', () => {
    it('should get valid JWT token', done => {
      request(app)
        .post(`${API.ROOT}${API.AUTH}/login`)
        .send(user)
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body).to.have.property('token');
          jwt.verify(res.body.token, config.jwtSecret, (err, decoded) => {
            expect(err).to.not.be.ok; // eslint-disable-line no-unused-expressions
            expect(decoded.username).to.equal(user.username);
            expect(decoded.password).to.equal(user.password);
            jwtToken = `Bearer ${res.body.token}`;
            done();
          });
        })
        .catch(done);
    });
  });

  describe('# GET /api/v1/health-check', () => {
    it('should return OK', done => {
      request(app)
        .get('/api/v1/health-check')
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.text).to.equal('OK');
          done();
        })
        .catch(done);
    });
  });

  describe('# GET /api/404', () => {
    it('should return 404 status', done => {
      request(app)
        .get('/api/404')
        .expect(httpStatus.NOT_FOUND)
        .then(res => {
          expect(res.body.message).to.equal('Not Found');
          done();
        })
        .catch(done);
    });
  });

  describe('# Error Handling', () => {
    it('should handle express validation error - assetId is required', done => {
      request(app)
        .post(`${API.ROOT}${API.ASSETS}`)
        .set('Authorization', jwtToken)
        .expect(httpStatus.BAD_REQUEST)
        .then(res => {
          expect(res.body.message).to.equal('"assetId" is required');
          done();
        })
        .catch(done);
    });
  });
});
