/*
 * SPDX-License-Identifier: Apache-2.0
 */

export enum InteractionSignatureType {
  MINT = 0,
  BURN = 1,
  ASSIGN = 2,
  CHECKPERMITION = 3,
  LOCK = 4,
  UNLOCK = 5,
}

export enum VarType {
  CONTRACTNAME = 0,
  CHANNELNAME = 1,
  TOKENID = 2,
  OWNER = 3,
  OWNERMSPID = 4,
  AMOUNT = 5,
  BRIDGE = 6,
  BRIDGEMSPID = 7,
  RECEIVER = 8,
  MSPID = 9,
}

export class InteractionSignature {
  type: InteractionSignatureType;
  functionsSignature: string[];
  variables: VarType[][];
}
