const Joi = require('joi');

const origin = Joi.object({
  originDLTId: Joi.string().required(),
  originAssetId: Joi.string().required(),
});

module.exports = {
  /** GET /api/v1/asset/:assetId - Get Asset */
  getAsset: {
    params: {
      assetId: Joi.string().required(),
    },
  },

  /** POST /api/v1/asset - Create asset */
  createAsset: {
    body: {
      assetId: Joi.string().required(),
      origin: Joi.array()
        .min(1)
        .items(origin),
      properties: Joi.object({
        property1: Joi.string().required(),
        property2: Joi.string().required(),
      }),
    },
  },

  /** POST /api/v1/asset/:assetId - Lock Asset */
  lockAsset: {
    body: {
      targetDLTId: Joi.string().required(),
      receiverPubKey: Joi.string().required(),
    },
    params: {
      assetId: Joi.string().required(),
    },
  },

  /** PUT /api/v1/asset/:assetId - Set Asset Property */
  setProperty: {
    body: {
      name: Joi.string()
        .valid(['property1', 'property2'])
        .required(),
      value: Joi.string().required(),
    },
    params: {
      assetId: Joi.string().required(),
    },
  },
};
