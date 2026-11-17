import type {
  ActiveContract,
  WatchBlocksV1Event,
  WatchBlocksV1Progress,
} from "./generated/openapi/typescript-axios";
import type {
  ICantonCreatedEvent,
  ICantonTransaction,
} from "./canton-wallet-sdk";

/** Converts a ledger created event into the connector's contract DTO. */
export function toActiveContract(
  event: ICantonCreatedEvent,
  synchronizerId: string,
): ActiveContract {
  return {
    contractId: event.contractId,
    templateId: event.templateId,
    createArgument: event.createArgument as ActiveContract["createArgument"],
    witnessParties: [...event.witnessParties],
    signatories: [...event.signatories],
    observers: event.observers ? [...event.observers] : undefined,
    createdAt: event.createdAt,
    synchronizerId,
    interfaceViews: event.interfaceViews?.map((view) => ({
      interfaceId: view.interfaceId,
      viewStatus: {
        code: view.viewStatus.code,
        message: view.viewStatus.message,
      },
      viewValue: view.viewValue,
    })),
  };
}

/**
 * Converts an ACS-delta transaction into a WatchBlocksV1 message. Only the
 * documented fields are copied, so ledger additions such as trace context
 * are never forwarded to socket clients.
 */
export function toWatchBlocksProgress(
  transaction: ICantonTransaction,
): WatchBlocksV1Progress {
  const events = transaction.events.flatMap((event): WatchBlocksV1Event[] => {
    if (event.CreatedEvent) {
      return [
        {
          created: toActiveContract(
            event.CreatedEvent,
            transaction.synchronizerId,
          ),
        },
      ];
    }
    if (event.ArchivedEvent) {
      return [
        {
          archived: {
            contractId: event.ArchivedEvent.contractId,
            templateId: event.ArchivedEvent.templateId,
            witnessParties: [...event.ArchivedEvent.witnessParties],
          },
        },
      ];
    }
    return [];
  });
  return {
    offset: transaction.offset,
    updateId: transaction.updateId,
    commandId: transaction.commandId,
    workflowId: transaction.workflowId,
    effectiveAt: transaction.effectiveAt,
    synchronizerId: transaction.synchronizerId,
    events,
  };
}
