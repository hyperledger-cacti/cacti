/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * testDriver_transferNumericAsset.js
 */

const request = require('request');

var param = {
    apiType: "transferNumericAsset",
    progress: "",
    data: {
    fromAddress : "ec709e1774f0ce4aba47b52a499f9abaaa159f71",
    toAddress : "2666a32bf7594ab5395d766dcfbf03d557dab538",
    amount : 50
   }
};
var target = 'http://localhost:5000/validatorDriver?validator=ethereum&func=requestLedgerOperation&param=' + JSON.stringify(param);

console.log('url : ' + target);

const options = {
    url: target,
    method: 'GET'
};

request(options, (error, response, body) => {
    if (error !== null) {
        console.log('error:', error);
        return (false);
    }

    console.log('statusCode:', response && response.statusCode);
    console.log('body:', body);
});

