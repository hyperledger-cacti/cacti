const Joi = require('joi');

module.exports = {
  // POST /api/v1/actors
  registerActor: {
    body: Joi.object({
      name: Joi.string().required(),
      type: Joi.string()
        .valid(['PARTICIPANT', 'VALIDATOR', 'FOREIGN_VALIDATOR'])
        .default('FOREIGN_VALIDATOR'),
      pubKey: Joi.string().required(),
    }),
  },

  /** POST /api/v1/actors/verify - Verify signatures */
  verify: {
    body: {
      message: Joi.string().required(),
      signatures: Joi.array()
        .min(1)
        .items(Joi.string())
        .required(),
    },
  },

  /** POST /api/v1/actors/verify-and-create - Verify signatures and Create asset */
  verifyAndCreate: {
    body: {
      message: Joi.string().required(),
      signatures: Joi.array()
        .min(1)
        .items(Joi.string())
        .required(),
      minGood: Joi.number(),
    },
  },
};
