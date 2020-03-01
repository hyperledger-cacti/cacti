const request = require('supertest-as-promised');
const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const app = require('../../index');
const config = require('../../config/config');
const { API } = require('../../config/constants');

const { expect } = chai;
chai.config.includeStack = true;

// eslint-disable-next-line
describe('## Auth APIs', function() {
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

    it('should return Authentication error', done => {
      user.password = 'invalidPassword';
      request(app)
        .post(`${API.ROOT}${API.AUTH}/login`)
        .send(user)
        .expect(httpStatus.UNAUTHORIZED)
        .then(res => {
          expect(res.body.message).to.equal('Authentication error');
          done();
        })
        .catch(done);
    });
  });

  describe('# GET /api/auth/random-number', () => {
    it('should fail to get random number because of missing Authorization', done => {
      request(app)
        .get(`${API.ROOT}${API.AUTH}/random-number`)
        .expect(httpStatus.UNAUTHORIZED)
        .then(res => {
          expect(res.body.message).to.equal('Unauthorized');
          done();
        })
        .catch(done);
    });

    it('should fail to get random number because of wrong token', done => {
      request(app)
        .get(`${API.ROOT}${API.AUTH}/random-number`)
        .set('Authorization', 'Bearer inValidToken')
        .expect(httpStatus.UNAUTHORIZED)
        .then(res => {
          expect(res.body.message).to.equal('Unauthorized');
          done();
        })
        .catch(done);
    });

    it('should get a random number', done => {
      request(app)
        .get(`${API.ROOT}${API.AUTH}/random-number`)
        .set('Authorization', jwtToken)
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body.num).to.be.a('number');
          done();
        })
        .catch(done);
    });
  });
});
