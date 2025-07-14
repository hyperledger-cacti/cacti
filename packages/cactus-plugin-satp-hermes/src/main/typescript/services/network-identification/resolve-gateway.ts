import { LedgerType } from "@hyperledger/cactus-core-api";
import { GatewayIdentity } from "../../core/types";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { context, SpanStatusCode, trace } from "@opentelemetry/api";

// gets an ID, queries a repository, returns a gateway identity
export async function resolveGatewayID(
  logger: Logger,
  ID: string,
): Promise<GatewayIdentity> {
  const fnTag = `#resolveGatewayID()`;
  const tracer = trace.getTracer("satp-hermes-tracer");
  const span = tracer.startSpan(fnTag);
  const ctx = trace.setSpan(context.active(), span);
  return context.with(ctx, async () => {
    try {
      logger.trace(`Entering ${fnTag}`);
      logger.info(`Resolving gateway with ID: ${ID}`);

      const mockGatewayIdentity: GatewayIdentity[] = [
        {
          id: "1",
          name: "Gateway1",
          version: [
            {
              Core: "1.0",
              Architecture: "1.0",
              Crash: "1.0",
            },
          ],
          connectedDLTs: [
            { id: "BESU", ledgerType: LedgerType.Besu2X },
            { id: "FABRIC", ledgerType: LedgerType.Fabric2 },
            { id: "ETH", ledgerType: LedgerType.Ethereum },
          ],
          proofID: "mockProofID1",
          gatewayServerPort: 3011,
          address: "http://localhost",
        },
        {
          id: "2",
          name: "Gateway2",
          version: [
            {
              Core: "1.0",
              Architecture: "1.0",
              Crash: "1.0",
            },
          ],
          connectedDLTs: [
            { id: "BESU", ledgerType: LedgerType.Besu2X },
            { id: "FABRIC", ledgerType: LedgerType.Fabric2 },
            { id: "ETH", ledgerType: LedgerType.Ethereum },
          ],
          proofID: "mockProofID1",
          gatewayServerPort: 3012,
          address: "http://localhost",
        },
      ];
      return mockGatewayIdentity.filter((gateway) => gateway.id === ID)[0];
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// TODO! dummy implementation for testing; contains hardcoded gateways similar to Bitcoin seeds
export function getGatewaySeeds(logger: Logger): GatewayIdentity[] {
  const fnTag = `#getGatewaySeeds()`;
  logger.trace(`Entering ${fnTag}`);
  return [];
}
