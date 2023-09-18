/*
 * Copyright 2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper functions used by directly by artillery framework
 */

module.exports = {
  checkInvokeContractWithPrivateKeyResponse:
    checkInvokeContractWithPrivateKeyResponse,
};

/**
 * Check response from invoke-contract endpoint when private key is used.
 * It handles false-positive errors that occur due to frequent sending of transactions (not connectors fault),
 * i.e. nonce to low or replacement transaction underpriced.
 *
 * Warning!
 * Errors will be shown in report but will not fail the stress test (since they are not integrated with expect plugin)
 */
function checkInvokeContractWithPrivateKeyResponse(
  requestParams,
  response,
  context,
  ee,
  next,
) {
  const responseBody = JSON.parse(response.body);
  if (response.statusCode === 200 && responseBody.success) {
    return next();
  }

  if (
    response.statusCode === 400 &&
    (responseBody.error.includes("replacement transaction underpriced") ||
      responseBody.error.includes("nonce too low"))
  ) {
    return next();
  }

  console.error(`Wrong response [${response.statusCode}]: ${response.body}`);
  return next(new Error(responseBody.error));
}
