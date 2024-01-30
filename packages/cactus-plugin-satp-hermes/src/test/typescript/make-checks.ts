import { PluginSATPGateway } from "../../main/typescript/plugin-satp-gateway";

export async function makeSessionDataChecks(
  pluginSourceGateway: PluginSATPGateway,
  pluginRecipientGateway: PluginSATPGateway,
  sessionId: string,
): Promise<void> {
  const clientSessionData = pluginSourceGateway.sessions.get(sessionId);
  const serverSessionData = pluginRecipientGateway.sessions.get(sessionId);

  expect(clientSessionData).not.toBeUndefined();
  expect(serverSessionData).not.toBeUndefined();

  expect(clientSessionData?.id).toBe(serverSessionData?.id);
  expect(clientSessionData?.id).toBe(sessionId);

  expect(clientSessionData?.loggingProfile).toBe(
    serverSessionData?.loggingProfile,
  );

  expect(clientSessionData?.accessControlProfile).toBe(
    serverSessionData?.accessControlProfile,
  );

  expect(clientSessionData?.applicationProfile).toBe(
    serverSessionData?.applicationProfile,
  );

  expect(JSON.stringify(clientSessionData?.assetProfile)).toBe(
    JSON.stringify(serverSessionData?.assetProfile),
  );

  expect(clientSessionData?.sourceGatewayPubkey).toBe(
    serverSessionData?.sourceGatewayPubkey,
  );

  expect(clientSessionData?.sourceGatewayDltSystem).toBe(
    serverSessionData?.sourceGatewayDltSystem,
  );

  expect(clientSessionData?.recipientGatewayPubkey).toBe(
    serverSessionData?.recipientGatewayPubkey,
  );

  expect(clientSessionData?.recipientGatewayDltSystem).toBe(
    serverSessionData?.recipientGatewayDltSystem,
  );

  expect(clientSessionData?.initializationRequestMessageHash).toBe(
    serverSessionData?.initializationRequestMessageHash,
  );

  expect(clientSessionData?.initializationResponseMessageHash).toBe(
    serverSessionData?.initializationResponseMessageHash,
  );

  expect(clientSessionData?.clientSignatureInitializationRequestMessage).toBe(
    serverSessionData?.clientSignatureInitializationRequestMessage,
  );

  expect(clientSessionData?.serverSignatureInitializationResponseMessage).toBe(
    serverSessionData?.serverSignatureInitializationResponseMessage,
  );

  expect(clientSessionData?.transferCommenceMessageRequestHash).toBe(
    serverSessionData?.transferCommenceMessageRequestHash,
  );

  expect(clientSessionData?.transferCommenceMessageResponseHash).toBe(
    serverSessionData?.transferCommenceMessageResponseHash,
  );

  expect(clientSessionData?.clientSignatureTransferCommenceRequestMessage).toBe(
    serverSessionData?.clientSignatureTransferCommenceRequestMessage,
  );

  expect(
    clientSessionData?.serverSignatureTransferCommenceResponseMessage,
  ).toBe(serverSessionData?.serverSignatureTransferCommenceResponseMessage);

  expect(clientSessionData?.lockEvidenceRequestMessageHash).toBe(
    serverSessionData?.lockEvidenceRequestMessageHash,
  );

  expect(clientSessionData?.lockEvidenceResponseMessageHash).toBe(
    serverSessionData?.lockEvidenceResponseMessageHash,
  );

  expect(clientSessionData?.clientSignatureLockEvidenceRequestMessage).toBe(
    serverSessionData?.clientSignatureLockEvidenceRequestMessage,
  );

  expect(clientSessionData?.serverSignatureLockEvidenceResponseMessage).toBe(
    serverSessionData?.serverSignatureLockEvidenceResponseMessage,
  );

  expect(clientSessionData?.lockEvidenceClaim).toBe(
    serverSessionData?.lockEvidenceClaim,
  );

  expect(clientSessionData?.commitPrepareRequestMessageHash).toBe(
    serverSessionData?.commitPrepareRequestMessageHash,
  );

  expect(clientSessionData?.commitPrepareResponseMessageHash).toBe(
    serverSessionData?.commitPrepareResponseMessageHash,
  );

  expect(
    clientSessionData?.clientSignatureCommitPreparationRequestMessage,
  ).toBe(serverSessionData?.clientSignatureCommitPreparationRequestMessage);

  expect(
    clientSessionData?.serverSignatureCommitPreparationResponseMessage,
  ).toBe(serverSessionData?.serverSignatureCommitPreparationResponseMessage);

  expect(clientSessionData?.commitFinalRequestMessageHash).toBe(
    serverSessionData?.commitFinalRequestMessageHash,
  );

  expect(clientSessionData?.commitPrepareRequestMessageHash).toBe(
    serverSessionData?.commitPrepareRequestMessageHash,
  );

  expect(clientSessionData?.commitFinalResponseMessageHash).toBe(
    serverSessionData?.commitFinalResponseMessageHash,
  );

  expect(clientSessionData?.commitFinalClaim).toBe(
    serverSessionData?.commitFinalClaim,
  );

  expect(clientSessionData?.commitFinalClaimFormat).toBe(
    serverSessionData?.commitFinalClaimFormat,
  );

  expect(clientSessionData?.commitAcknowledgementClaim).toBe(
    serverSessionData?.commitAcknowledgementClaim,
  );

  expect(clientSessionData?.commitAcknowledgementClaimFormat).toBe(
    serverSessionData?.commitAcknowledgementClaimFormat,
  );

  expect(clientSessionData?.clientSignatureCommitFinalRequestMessage).toBe(
    serverSessionData?.clientSignatureCommitFinalRequestMessage,
  );

  expect(clientSessionData?.serverSignatureCommitFinalResponseMessage).toBe(
    serverSessionData?.serverSignatureCommitFinalResponseMessage,
  );

  expect(clientSessionData?.transferCompleteMessageHash).toBe(
    serverSessionData?.transferCompleteMessageHash,
  );

  expect(clientSessionData?.clientSignatureTransferCompleteMessage).toBe(
    serverSessionData?.clientSignatureTransferCompleteMessage,
  );

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "validate"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "validate"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "validate"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "ack", "validate"),
    ),
  ).resolves.not.toBeUndefined();

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "commence"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "commence"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "commence"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "ack", "commence"),
    ),
  ).resolves.not.toBeUndefined();

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "lock"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "lock"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "lock"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "ack", "lock"),
    ),
  ).resolves.not.toBeUndefined();

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "prepare"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "prepare"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "prepare"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "ack", "prepare"),
    ),
  ).resolves.not.toBeUndefined();

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "final"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "final"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "final"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "ack", "final"),
    ),
  ).resolves.not.toBeUndefined();

  await expect(
    pluginSourceGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "init", "complete"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "exec", "complete"),
    ),
  ).resolves.not.toBeUndefined();
  await expect(
    pluginRecipientGateway.getLogFromDatabase(
      PluginSATPGateway.getSatpLogKey(sessionId, "done", "complete"),
    ),
  ).resolves.not.toBeUndefined();
}
