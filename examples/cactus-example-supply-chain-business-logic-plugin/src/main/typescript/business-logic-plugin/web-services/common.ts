import { verifyMessage } from "ethers";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "payment-common",
});

/**
 * Verifies an Ethereum signature
 * @param address The wallet address that supposedly signed the message
 * @param signature The signature to verify
 * @param message The message that was signed
 * @returns boolean indicating whether the signature is valid
 */
export async function verifySignature(
  address: string,
  signature: string,
  message: string,
): Promise<boolean> {
  try {
    const originalMessage = message.replace(/\|/g, "\n");
    const recoveredAddress = verifyMessage(originalMessage, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    log.error(`Signature verification failed: ${error}`);
    return false;
  }
}
