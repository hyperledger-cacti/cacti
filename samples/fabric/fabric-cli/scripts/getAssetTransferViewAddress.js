/*
SPDX-License-Identifier: Apache-2.0
*/
const fs = require('fs');

function getECertBase64(networkId, userId) {
    const walletIdFilePath = __dirname + '/../src/wallet-' + networkId + '/' + userId + '.id';
    const userIdJSON = JSON.parse(fs.readFileSync(walletIdFilePath).toString());
    return Buffer.from(userIdJSON.credentials.certificate).toString('base64');
}

function getClaimViewAddress(assetCategory, sourceNetwork, pledger, destNetwork, recipient, pledgeId) {
    let address = 'localhost:';

    if (sourceNetwork === 'network1') {
        address = address + '9080/network1/';
    } else if (sourceNetwork === 'network2') {
        address = address + '9083/network2/';
    } else {
        console.log('Unrecognized source network:', sourceNetwork);
        process.exit(1);
    }
    address = address + 'mychannel:simpleassettransfer:';
    if (assetCategory === 'bond') {
        address = address + 'GetAssetPledgeStatus';
    } else if (assetCategory === 'token') {
        address = address + 'GetTokenAssetPledgeStatus';
    } else {
        console.log('Unecognized asset category:', assetCategory);
        process.exit(1);
    }
    address = address + ':' + pledgeId + ':';
    const pledgerCert = getECertBase64(sourceNetwork, pledger);
    address = address + pledgerCert + ':' + destNetwork + ':';
    const recipientCert = getECertBase64(destNetwork, recipient);
    address = address + recipientCert;

    return address;
}

function getReclaimViewAddress(assetCategory, sourceNetwork, pledger, destNetwork, recipient, assetType, assetIdOrQuantity, pledgeId) {
    let address = 'localhost:';

    if (destNetwork === 'network1') {
        address = address + '9080/network1/';
    } else if (destNetwork === 'network2') {
        address = address + '9083/network2/';
    } else {
        console.log('Unrecognized destination network:', destNetwork);
        process.exit(1);
    }
    address = address + 'mychannel:simpleassettransfer:';
    if (assetCategory === 'bond') {
        address = address + 'GetAssetClaimStatus';
    } else if (assetCategory === 'token') {
        address = address + 'GetTokenAssetClaimStatus';
    } else {
        console.log('Unecognized asset category:', assetCategory);
        process.exit(1);
    }
    address = address + ':' + pledgeId + ':' + assetType + ':' + assetIdOrQuantity + ':';
    const recipientCert = getECertBase64(destNetwork, recipient);
    address = address + recipientCert + ':';
    const pledgerCert = getECertBase64(sourceNetwork, pledger);
    address = address + pledgerCert + ':' + sourceNetwork;

    return address;
}

if (process.argv.length != 5 && process.argv.length != 9 && process.argv.length != 11) {
    console.log('Usage: node getAssetTransferViewAddress.js claim bond|token <source-network-id> <pledger-id> <dest-network-id> <recipient-id> <pledge-id>');
    console.log('Usage: node getAssetTransferViewAddress.js reclaim bond|token <source-network-id> <pledger-id> <dest-network-id> <recipient-id> <asset-type> <asset-id-or-quantity> <pledge-id>');
    console.log('Usage: node getAssetTransferViewAddress.js getusercert <network-id> <user-id>');
    process.exit(1);
}

if (process.argv[2] === 'claim') {
    console.log(getClaimViewAddress(process.argv[3], process.argv[4], process.argv[5], process.argv[6], process.argv[7], process.argv[8]));
} else if (process.argv[2] === 'reclaim') {
    console.log(getReclaimViewAddress(process.argv[3], process.argv[4], process.argv[5], process.argv[6], process.argv[7], process.argv[8], process.argv[9], process.argv[10]));
} else if (process.argv[2] === 'getusercert') {
    console.log(getECertBase64(process.argv[3], process.argv[4]));
} else {
    console.log('Unrecognized operation:', process.argv[2]);
}
