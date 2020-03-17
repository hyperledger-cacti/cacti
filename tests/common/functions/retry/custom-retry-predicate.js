/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint max-length: "off" */
/* eslint func-names: ["error", "never"] */

const chai = require(`chai`);
const { Functions } = require('../../../../src/common/functions');

describe(`common/functions/retry`, () => {
  it('custom predicate is invoked when provided', async () => {
    let didSucceed = false;
    let triesSoFar = 0;
    let result;
    try {
      result = await Functions.retry(
        async () => {
          if (triesSoFar <= 5) {
            triesSoFar += 1;
            throw new Error('ECONNRESET');
          }
          return 'OK';
        },
        (tryIndex, ex) => {
          return tryIndex <= 10 && ex.stack.includes('ECONNRESET');
        }
      );
      didSucceed = true;
    } catch (ex) {
      didSucceed = false;
    }
    chai.expect(didSucceed).to.equal(true);
    chai.expect(result).to.equal('OK');
  });
});
