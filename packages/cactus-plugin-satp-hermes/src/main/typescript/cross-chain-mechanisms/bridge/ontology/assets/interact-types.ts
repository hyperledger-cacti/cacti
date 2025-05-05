export interface InteractionData {
  functionSignature: string;
  variables: string[];
  available: boolean;
}

export enum InteractionType {
  MINT = 0,
  BURN = 1,
  ASSIGN = 2,
  CHECKPERMISSION = 3,
  LOCK = 4,
  UNLOCK = 5,
}

export function getInteractionType(stringType: string) {
  return InteractionType[
    stringType.toUpperCase() as keyof typeof InteractionType
  ];
}
