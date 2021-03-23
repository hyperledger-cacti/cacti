/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 * 
 * default.js
 */

module.exports = {
    // URL to validator
    //"validatorUrl" : 'https://localhost:5040',
    "validatorUrl" : 'https://localhost:5041',
    
    // for fabric
    "fabric":{
        "mspid": "Org1MSP",
        "keystore":"./wallet/admin", // TODO:
        "connUserName":"user1", // TODO:
        "contractName":"fabcar", // TODO:
        "peers":[ 
          {
            "name":"peer0.org1.example.com",
            "requests": "grpc://localhost:7051",
          }
        ],

        "orderer":{
            "name":"orderer.example.com",
            "url":"grpc://localhost:7050",
        },
        "ca":{
            "name":"ca.example.com",
            "url":"http://localhost:7054"
        },
        "submitter":{
            "name":"admin",
            "secret":"adminpw"
        },
        "channelName":"mychannel",
        "chaincodeId":"easy_sample_ec1"
     }
};
