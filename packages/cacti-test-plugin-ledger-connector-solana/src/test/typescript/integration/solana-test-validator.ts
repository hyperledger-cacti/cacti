/**
 * Provides a containerized `solana-test-validator` localnet for the test-package
 * integration tests via {@link SolanaTestLedger} (the Docker-based pattern the
 * other connectors use). Each test file gets its own throwaway container;
 * `startTestValidator()` returns the dynamically-mapped JSON-RPC URL.
 *
 * The image (`anzaxyz/agave`) is `linux/amd64` only, so on an ARM host it runs
 * under emulation; CI runners are amd64 and run it natively.
 */
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { SolanaTestLedger } from "@hyperledger/cactus-test-tooling";

let ledger: SolanaTestLedger | undefined;

/**
 * Start a throwaway containerized localnet and return its JSON-RPC URL (the RPC
 * port is mapped to a random host port, so callers must use the returned URL
 * rather than a fixed one).
 */
export async function startTestValidator(): Promise<string> {
  ledger = new SolanaTestLedger({ logLevel: "warn", emitContainerLogs: false });
  await ledger.start();
  return ledger.getRpcApiHttpHost();
}

/** Stop and remove the container started by {@link startTestValidator}. */
export async function stopTestValidator(): Promise<void> {
  if (ledger) {
    await ledger.stop();
    await ledger.destroy();
    ledger = undefined;
  }
}

/** Convenience: fund an account with SOL and confirm. */
export async function airdropSol(
  conn: Connection,
  pubkeyBase58: string,
  sol: number,
): Promise<void> {
  const sig = await conn.requestAirdrop(
    new PublicKey(pubkeyBase58),
    sol * LAMPORTS_PER_SOL,
  );
  // Use the blockhash-based confirmation strategy instead of the deprecated
  // signature-only form: the latter relies solely on a websocket
  // signatureSubscribe notification and hangs forever if the airdrop confirms
  // before the subscription registers (a common race on a fast localnet).
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed",
  );
}
