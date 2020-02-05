/* eslint prefer-arrow-callback: "off" */
/* eslint no-new: "off" */
/* eslint func-names: ["error", "never"] */
const chai = require(`chai`);

const Connector = require(`../src/plugins/Connector`);

describe(`Connector Constructor`, function() {
  it(`New instance of abstract class 'Connector' should throw`, function() {
    chai
      .expect(() => {
        const connector = new Connector(); // eslint-disable-line
      })
      .to.throw(TypeError, `can not instanciate abstract class.`);
  });
});
