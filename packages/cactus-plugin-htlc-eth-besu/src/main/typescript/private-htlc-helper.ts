import * as ethers from "ethers";
import BN from "bn.js";
import * as dotenv from "dotenv";
import path from "path";

const envPath = path.join(__dirname, "../../../.env");
dotenv.config({ path: envPath });
const providerURL = process.env.RPC;

const main = async () => {
  try {
    if (!providerURL) {
      throw new Error("no provider");
    }

    console.log("====== NON PRIVACY PRESERVING HTLC =======");
    const secret = "my_secret";
    const hashPair = newSecretHashPair(secret);

    const HASH_MY_SECRET_NOT_PRIVATE = hashPair.secretHash;
    const BYTES32_SECRET_NOT_PRIVATE = hashPair.secretBytes;
    const BYTES32_SECRET_NOT_PRIVATE_ENCODED = ethers.decodeBytes32String(
      BYTES32_SECRET_NOT_PRIVATE,
    );

    console.log(`HASH_MY_SECRET_NOT_PRIVATE: ${HASH_MY_SECRET_NOT_PRIVATE}`);
    console.log(`BYTES32_SECRET_NOT_PRIVATE: ${BYTES32_SECRET_NOT_PRIVATE}`);
    console.log(
      `BYTES32_SECRET_NOT_PRIVATE_ENCODED: ${BYTES32_SECRET_NOT_PRIVATE_ENCODED}`,
    );

    const timelockA = getEpochTimeWithHours(2);
    console.log(`timelockA ${timelockA}`);

    const timelockB = getEpochTimeWithHours(1);
    console.log(`timelockB ${timelockB}`);

    console.log("====== PRIVACY PRESERVING HTLC =======");
    const GENERATOR = new BN(11);
    const MODULUS = new BN(109);
    const SECRET_ALICE = new BN(3);
    const BOB_INPUT_TO_Z = new BN(50);

    const exponentiationAliceHashLock = modExp(
      GENERATOR,
      MODULUS,
      SECRET_ALICE,
    );
    const HASH_SECRET_ALICE = toBytes32(exponentiationAliceHashLock);
    console.log(`Ya: ${HASH_SECRET_ALICE}`);
    console.log(`sa: ${toBytes32(SECRET_ALICE)}`);

    const Z = modExp(GENERATOR, MODULUS, SECRET_ALICE.mul(BOB_INPUT_TO_Z));
    const BYTES_32_Z = toBytes32(Z);
    console.log(`Z: ${BYTES_32_Z}`);

    const YB = exponentiationAliceHashLock
      .mul(modExp(GENERATOR, MODULUS, new BN(Z.toNumber())))
      .mod(MODULUS);
    console.log(`Yb: ${YB}`);
    console.log(`Yb: ${toBytes32(YB)}`);

    const sb = SECRET_ALICE.add(Z);
    console.log(`sb: ${sb}`);
    console.log(`sb: ${toBytes32(sb)}`);
  } catch (error) {
    console.log("There has been an error ", error);
    throw new Error();
  }
};

main().catch((error) => {
  console.log("Caught promise rejection (validation failed). Errors: ", error);
  throw new Error();
});

function modExp(base: BN, modulus: BN, exponent: BN): BN {
  const result = base.toRed(BN.red(modulus)).redPow(exponent);
  console.log(`Exponentiation is: ${result}`);
  return result;
}

function toBytes32(value: BN): string {
  const hex = ethers.toBeHex(value.toString());
  return ethers.zeroPadValue(hex, 32);
}

function getEpochTimeWithHours(hoursToAdd = 0) {
  const now = new Date();
  now.setHours(now.getHours() + hoursToAdd);

  return Math.floor(now.getTime() / 1000);
}

function newSecretHashPair(secret: string) {
  const secretBytes = ethers.encodeBytes32String(secret);
  const secretHash = ethers.keccak256(secretBytes);
  return {
    secretBytes: secretBytes,
    secretHash: secretHash,
  };
}
