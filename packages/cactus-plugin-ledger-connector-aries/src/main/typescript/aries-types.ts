/**
 * Helper functions used mostly to convert from Open API endpoint inputs to Aries compatible structures.
 */

import { Agent, Query } from "@credo-ts/core";
import {
  DidCommAutoAcceptCredential,
  DidCommAutoAcceptProof,
  DidCommConnectionRecord,
  DidCommDidExchangeState,
  DidCommDidExchangeRole,
} from "@credo-ts/didcomm";
import type { AnonCredsRequestedAttribute } from "@credo-ts/anoncreds";

import {
  AgentConnectionsFilterV1,
  CactiAcceptPolicyV1,
  CactiProofRequestAttributeV1,
  PluginLedgerConnectorAries,
} from "./public-api";

/**
 * Aries JS Agent with Anoncreds/Indy/Askar modules configured.
 * This is exact Agent type returned by factories used by this connector for now.
 */
export type AnoncredAgent = Agent<
  ReturnType<PluginLedgerConnectorAries["getAskarAnonCredsIndyModules"]>
>;

/**
 * Convert Cacti OpenAPI input to Aries compatible `AutoAcceptProof`
 *
 * @param policy `CactiAcceptPolicyV1`
 * @returns `AutoAcceptProof`
 */
export function cactiAcceptPolicyToAutoAcceptProof(
  policy: CactiAcceptPolicyV1,
): DidCommAutoAcceptProof {
  switch (policy) {
    case CactiAcceptPolicyV1.Always:
      return DidCommAutoAcceptProof.Always;
    case CactiAcceptPolicyV1.ContentApproved:
      return DidCommAutoAcceptProof.ContentApproved;
    case CactiAcceptPolicyV1.Never:
      return DidCommAutoAcceptProof.Never;
    default:
      const _unknownPolicy: never = policy;
      throw new Error(`Unknown CactiAcceptPolicyV1: ${_unknownPolicy}`);
  }
}

/**
 * Convert Cacti OpenAPI input to Aries compatible `AutoAcceptCredential`
 *
 * @param policy `CactiAcceptPolicyV1`
 * @returns `AutoAcceptCredential`
 */
export function cactiAcceptPolicyToAutoAcceptCredential(
  policy: CactiAcceptPolicyV1,
): DidCommAutoAcceptCredential {
  switch (policy) {
    case CactiAcceptPolicyV1.Always:
      return DidCommAutoAcceptCredential.Always;
    case CactiAcceptPolicyV1.ContentApproved:
      return DidCommAutoAcceptCredential.ContentApproved;
    case CactiAcceptPolicyV1.Never:
      return DidCommAutoAcceptCredential.Never;
    default:
      const _unknownPolicy: never = policy;
      throw new Error(`Unknown CactiAcceptPolicyV1: ${_unknownPolicy}`);
  }
}

/**
 * Validate and convert value to any enum (intended to use with AFJ but should work with any enum)
 *
 * @param enumType enum to validate the value against
 * @param value string value
 * @returns same value converted to the enum or undefined if value missing. Throws exception if validation failed.
 */
export function validateEnumValue<T extends Record<string, string>>(
  enumType: T,
  value?: string,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  if (!Object.values(enumType).includes(value)) {
    throw new Error(`Invalid aries enum value: ${value}`);
  }

  return value as unknown as T[keyof T];
}

/**
 * Convert Cacti OpenAPI input to Aries compatible `ConnectionRecord` filter `Query`.
 * Validates enums and throws exception if invalid value was used.
 *
 * @param filter `AgentConnectionsFilterV1`
 * @returns `Query<ConnectionRecord>`
 */
export function cactiAgentConnectionsFilterToQuery(
  filter: AgentConnectionsFilterV1,
): Query<DidCommConnectionRecord> {
  return {
    ...filter,
    state: validateEnumValue(DidCommDidExchangeState, filter.state),
    role: validateEnumValue(DidCommDidExchangeRole, filter.role),
  };
}

/**
 * Convert Cacti OpenAPI input to Aries compatible proof request restrictions.
 *
 * @param proofAttributes `CactiProofRequestAttributeV1[]`
 * @returns `Record<string, AnonCredsRequestedAttribute>`
 */
export async function cactiAttributesToAnonCredsRequestedAttributes(
  proofAttributes: CactiProofRequestAttributeV1[],
): Promise<Record<string, AnonCredsRequestedAttribute>> {
  const attributesArray = proofAttributes.map((attr) => {
    return [
      attr.name,
      {
        name: attr.name,
        restrictions: [
          {
            [`attr::${attr.name}::value`]: attr.isValueEqual,
            cred_def_id: attr.isCredentialDefinitionIdEqual,
          },
        ],
      },
    ];
  });

  return Object.fromEntries(attributesArray);
}
