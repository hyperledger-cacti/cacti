import { PluginOdapGateway } from "../../main/typescript/gateway/plugin-odap-gateway";

export async function makeSessionDataChecks(
  pluginSourceGateway: PluginOdapGateway,
  pluginRecipientGateway: PluginOdapGateway,
  sessionId: string,
): Promise<void> {
  const clientSessionData = pluginSourceGateway.sessions.get(sessionId);
  const serverSessionData = pluginRecipientGateway.sessions.get(sessionId);

  if (clientSessionData == undefined || serverSessionData == undefined) {
    throw new Error("Test Failed");
  }

  if (clientSessionData == undefined || serverSessionData == undefined) {
    throw new Error("Test Failed");
  }

  expect(clientSessionData.id).toBe(serverSessionData.id);
  expect(clientSessionData.id).toBe(sessionId);

  expect(clientSessionData.loggingProfile).toBe(
    serverSessionData.loggingProfile,
  );

  expect(clientSessionData.accessControlProfile).toBe(
    serverSessionData.accessControlProfile,
  );

  expect(clientSessionData.applicationProfile).toBe(
    serverSessionData.applicationProfile,
  );

  expect(JSON.stringify(clientSessionData.assetProfile)).toBe(
    JSON.stringify(serverSessionData.assetProfile),
  );

  expect(clientSessionData.sourceGatewayPubkey).toBe(
    serverSessionData.sourceGatewayPubkey,
  );

  expect(clientSessionData.sourceGatewayDltSystem).toBe(
    serverSessionData.sourceGatewayDltSystem,
  );

  expect(clientSessionData.recipientGatewayPubkey).toBe(
    serverSessionData.recipientGatewayPubkey,
  );

  expect(clientSessionData.recipientGatewayDltSystem).toBe(
    serverSessionData.recipientGatewayDltSystem,
  );

  expect(clientSessionData.initializationRequestMessageHash).toBe(
    serverSessionData.initializationRequestMessageHash,
  );

  expect(clientSessionData.initializationResponseMessageHash).toBe(
    serverSessionData.initializationResponseMessageHash,
  );

  expect(clientSessionData.clientSignatureInitializationRequestMessage).toBe(
    serverSessionData.clientSignatureInitializationRequestMessage,
  );

  expect(clientSessionData.serverSignatureInitializationResponseMessage).toBe(
    serverSessionData.serverSignatureInitializationResponseMessage,
  );

  expect(clientSessionData.transferCommenceMessageRequestHash).toBe(
    serverSessionData.transferCommenceMessageRequestHash,
  );

  expect(clientSessionData.transferCommenceMessageResponseHash).toBe(
    serverSessionData.transferCommenceMessageResponseHash,
  );

  expect(clientSessionData.clientSignatureTransferCommenceRequestMessage).toBe(
    serverSessionData.clientSignatureTransferCommenceRequestMessage,
  );

  expect(clientSessionData.serverSignatureTransferCommenceResponseMessage).toBe(
    serverSessionData.serverSignatureTransferCommenceResponseMessage,
  );

  expect(clientSessionData.lockEvidenceRequestMessageHash).toBe(
    serverSessionData.lockEvidenceRequestMessageHash,
  );

  expect(clientSessionData.lockEvidenceResponseMessageHash).toBe(
    serverSessionData.lockEvidenceResponseMessageHash,
  );

  expect(clientSessionData.clientSignatureLockEvidenceRequestMessage).toBe(
    serverSessionData.clientSignatureLockEvidenceRequestMessage,
  );

  expect(clientSessionData.serverSignatureLockEvidenceResponseMessage).toBe(
    serverSessionData.serverSignatureLockEvidenceResponseMessage,
  );

  expect(clientSessionData.lockEvidenceClaim).toBe(
    serverSessionData.lockEvidenceClaim,
  );

  expect(clientSessionData.commitPrepareRequestMessageHash).toBe(
    serverSessionData.commitPrepareRequestMessageHash,
  );

  expect(clientSessionData.commitPrepareResponseMessageHash).toBe(
    serverSessionData.commitPrepareResponseMessageHash,
  );

  expect(clientSessionData.clientSignatureCommitPreparationRequestMessage).toBe(
    serverSessionData.clientSignatureCommitPreparationRequestMessage,
  );

  expect(
    clientSessionData.serverSignatureCommitPreparationResponseMessage,
  ).toBe(serverSessionData.serverSignatureCommitPreparationResponseMessage);

  expect(clientSessionData.commitFinalRequestMessageHash).toBe(
    serverSessionData.commitFinalRequestMessageHash,
  );

  expect(clientSessionData.commitPrepareRequestMessageHash).toBe(
    serverSessionData.commitPrepareRequestMessageHash,
  );

  expect(clientSessionData.commitFinalResponseMessageHash).toBe(
    serverSessionData.commitFinalResponseMessageHash,
  );

  expect(clientSessionData.commitFinalClaim).toBe(
    serverSessionData.commitFinalClaim,
  );

  expect(clientSessionData.commitFinalClaimFormat).toBe(
    serverSessionData.commitFinalClaimFormat,
  );

  expect(clientSessionData.commitAcknowledgementClaim).toBe(
    serverSessionData.commitAcknowledgementClaim,
  );

  expect(clientSessionData.commitAcknowledgementClaimFormat).toBe(
    serverSessionData.commitAcknowledgementClaimFormat,
  );

  expect(clientSessionData.clientSignatureCommitFinalRequestMessage).toBe(
    serverSessionData.clientSignatureCommitFinalRequestMessage,
  );

  expect(clientSessionData.serverSignatureCommitFinalResponseMessage).toBe(
    serverSessionData.serverSignatureCommitFinalResponseMessage,
  );

  expect(clientSessionData.transferCompleteMessageHash).toBe(
    serverSessionData.transferCompleteMessageHash,
  );

  expect(clientSessionData.clientSignatureTransferCompleteMessage).toBe(
    serverSessionData.clientSignatureTransferCompleteMessage,
  );

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "validate"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "validate"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "validate"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "ack", "validate"),
    ),
  ).not.toBeUndefined();

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "commence"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "commence"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "commence"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "ack", "commence"),
    ),
  ).not.toBeUndefined();

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "lock"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "lock"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "lock"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "ack", "lock"),
    ),
  ).not.toBeUndefined();

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "prepare"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "prepare"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "prepare"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "ack", "prepare"),
    ),
  ).not.toBeUndefined();

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "final"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "final"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "final"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "ack", "final"),
    ),
  ).not.toBeUndefined();

  expect(
    await pluginSourceGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "init", "complete"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "exec", "complete"),
    ),
  ).not.toBeUndefined();
  expect(
    await pluginRecipientGateway.getLogFromDatabase(
      PluginOdapGateway.getOdapLogKey(sessionId, "done", "complete"),
    ),
  ).not.toBeUndefined();
}
