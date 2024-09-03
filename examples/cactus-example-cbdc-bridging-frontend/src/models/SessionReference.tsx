export interface SessionReference {
  id: string;
  status: string;
  substatus: string;
  originLedger: string;
  destinyLedger: string;
}

export function createSessionReference(
  id: string,
  status: string,
  substatus: string,
  originLedger: string,
  destinyLedger: string,
): SessionReference {
  return {
    id,
    status,
    substatus,
    originLedger,
    destinyLedger,
  };
}
