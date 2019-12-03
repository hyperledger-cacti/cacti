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
describe('## Assets APIs', function() {
  this.timeout(10000);

  let jwtToken;

  const user = {
    username: config.user.username,
    password: config.user.password,
  };

  const asset = {
    assetId: `Mocha_test_${Date.now()}`, // This is to make the assetId kind of unique
    origin: [
      {
        originDLTId: 'DLT100',
        originAssetId: 'Asset_DLT100_1',
      },
      {
        originDLTId: 'DLT200',
        originAssetId: 'Asset_DLT200_1',
      },
    ],
    properties: {
      property1: 'value_property_1',
      property2: 'value_property_2',
    },
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

  describe('# POST /api/assets', () => {
    it('should create asset', done => {
      request(app)
        .post(`${API.ROOT}${API.ASSETS}`)
        .set('Authorization', jwtToken)
        .send(asset)
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body.assetId).to.equal(asset.assetId);
          expect(res.body.origin).to.deep.equal(asset.origin);
          expect(res.body.property1).to.equal(asset.properties.property1);
          expect(res.body.property2).to.equal(asset.properties.property2);
          expect(res.body.locked).to.equal(false);
          expect(res.body.targetDltId).to.equal('');
          expect(res.body.receiverPK).to.equal('');
          done();
        })
        .catch(done);
    });
  });

  describe('# GET /api/assets/assetId', () => {
    it('should get asset', done => {
      request(app)
        .get(`${API.ROOT}${API.ASSETS}/${asset.assetId}`)
        .set('Authorization', jwtToken)
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body.assetId).to.equal(asset.assetId);
          expect(res.body.origin).to.deep.equal(asset.origin);
          expect(res.body.property1).to.equal(asset.properties.property1);
          expect(res.body.property2).to.equal(asset.properties.property2);
          expect(res.body.locked).to.equal(false);
          expect(res.body.targetDltId).to.equal('');
          expect(res.body.receiverPK).to.equal('');
          done();
        })
        .catch(done);
    });
  });

  const targetDLTId = 'IBM_DLT';
  const receiverPubKey = '031b3e4b65070268bd2ce3652966f75ebdf7184f637fd24a4fe0417c2dcb92fd9b';

  describe('# POST /api/assets/assetId', () => {
    it('should lock asset', done => {
      request(app)
        .post(`${API.ROOT}${API.ASSETS}/${asset.assetId}`)
        .set('Authorization', jwtToken)
        .send({ targetDLTId, receiverPubKey })
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body.assetId).to.equal(asset.assetId);
          expect(res.body.origin).to.deep.equal(asset.origin);
          expect(res.body.property1).to.equal(asset.properties.property1);
          expect(res.body.property2).to.equal(asset.properties.property2);
          expect(res.body.locked).to.equal(true);
          expect(res.body.targetDltId).to.equal(targetDLTId);
          expect(res.body.receiverPK).to.equal(receiverPubKey);
          done();
        })
        .catch(done);
    });
  });

  describe('# PUT /api/assets/assetId', () => {
    const name = 'property1';
    const value = 'text_value';

    it('should set asset property', done => {
      request(app)
        .put(`${API.ROOT}${API.ASSETS}/${asset.assetId}`)
        .set('Authorization', jwtToken)
        .send({ name, value })
        .expect(httpStatus.OK)
        .then(res => {
          expect(res.body.assetId).to.equal(asset.assetId);
          expect(res.body.origin).to.deep.equal(asset.origin);
          expect(res.body.property1).to.equal(value);
          expect(res.body.property2).to.equal(asset.properties.property2);
          expect(res.body.locked).to.equal(true);
          expect(res.body.targetDltId).to.equal(targetDLTId);
          expect(res.body.receiverPK).to.equal(receiverPubKey);
          done();
        })
        .catch(done);
    });
  });
});
