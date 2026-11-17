import type {
  ICantonLedgerApiRequest,
  ICantonUpdateEntry,
  ICantonUpdatesRequest,
} from "./types";

interface ICantonLedgerRequester {
  request(args: ICantonLedgerApiRequest): Promise<unknown>;
}

function buildCumulativeFilter(request: ICantonUpdatesRequest): unknown[] {
  if (request.templateIds) {
    return request.templateIds.map((templateId) => ({
      identifierFilter: {
        TemplateFilter: {
          value: { templateId, includeCreatedEventBlob: false },
        },
      },
    }));
  }
  if (request.interfaceIds) {
    return request.interfaceIds.map((interfaceId) => ({
      identifierFilter: {
        InterfaceFilter: {
          value: {
            interfaceId,
            includeCreatedEventBlob: false,
            includeInterfaceView: true,
          },
        },
      },
    }));
  }
  // An empty cumulative filter selects every template the party can see.
  return [];
}

/**
 * Reads `(beginExclusive, endInclusive]` of the update stream with
 * `POST /v2/updates`. Transactions use the ACS-delta shape, so they contain
 * only the created and archived events the parties are stakeholders of.
 */
export async function readCantonUpdates(
  ledgerProvider: ICantonLedgerRequester,
  request: ICantonUpdatesRequest,
): Promise<ICantonUpdateEntry[]> {
  const cumulative = buildCumulativeFilter(request);
  const filtersByParty = Object.fromEntries(
    request.parties.map((party) => [party, { cumulative }]),
  );
  const entries = await ledgerProvider.request({
    method: "ledgerApi",
    params: {
      requestMethod: "post",
      resource: "/v2/updates",
      query: { limit: request.limit },
      body: {
        beginExclusive: request.beginExclusive,
        endInclusive: request.endInclusive,
        updateFormat: {
          includeTransactions: {
            eventFormat: { filtersByParty, verbose: false },
            transactionShape: "TRANSACTION_SHAPE_ACS_DELTA",
          },
        },
      },
    },
  });
  if (!Array.isArray(entries)) {
    throw new Error("The Canton update response was not an array.");
  }
  return entries as ICantonUpdateEntry[];
}
