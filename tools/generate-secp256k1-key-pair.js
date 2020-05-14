const { randomBytes } = require("crypto");
const secp256k1 = require("secp256k1");

let privateKeyBytes;
do {
  privateKeyBytes = randomBytes(32);
} while (!secp256k1.privateKeyVerify(privateKeyBytes));

const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);

const privateKey = Buffer.from(privateKeyBytes).toString("hex");
const publicKey = Buffer.from(publicKeyBytes).toString("hex");

console.log(JSON.stringify({ privateKey, publicKey }, null, 4));

process.exit(0);
