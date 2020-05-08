export interface Ledger {
  // TODO come up with a more robust scheme for identifying ledgers
  id: string // "BITCOIN_MAIN_NET" or "HL_FABRIC_OF_XYZ"

  // Store any implementation specific data here that is necessary for a ledger connector object to be created.
  // Usually would contain the public API endpoints or pre-configured DNS seed hosts for node discovery purposes.
  // The LedgerConnector implementation is responsible for understanding the discovery config used by it's ledger.
  discoveryConfig: any;
}

export interface LedgerConnector {
  // method to verify a signature coming from a given ledger that this connector is responsible for connecting to.
  verifySignature(message, signature): Promise<boolean>;

  // used to call methods on smart contracts or to move assets between wallets
  transact(transactions: Transaction[])
}

export interface LedgerResolver {
  resolve(ledger: Ledger): Promise<LedgerConnector>;
}

export interface CryptographicallyProvableIdentity {
  // identifies the realm in which the identity is recognized such as Dif, DiD, Sovrin, etc.
  framworkId: string;
}

export interface SovrinIdentity extends CryptographicallyProvableIdentity {
}

// https://identity.foundation/
export interface DifIdentity extends CryptographicallyProvableIdentity {
}

// https://www.w3.org/TR/did-core/
export interface DidIdentity extends CryptographicallyProvableIdentity {
}

export interface Identity {
  // implementation specific hash that expresses the identity in a verifiable way
  // Defining this more broadly is the hard part here.
  data: CryptographicallyProvableIdentity;
}

// Asserts that the creator of this object has a certain identity
export interface IIdentityProof {

  // Cryptographic signature of the owner of this identity, used for
  // verification of identity, technically, can be a token, digital signature
  // or anything else that the identity framework will understand
  signature: string;

  // Reference to the identity that the creater of this object claims for themselves.
  identityClaim: Identity;
}

export interface Transaction {
  // TODO
}

export interface TransactionProposal {
  // Used to correlate different objects belonging to the same transaction throughout the message flow
  correlationId: string;

  // Who is/are the initiator(s) of the transaction? Could be someone sending or requesting funds or any other asset.
  // Can be multiple parties in certain scenarios.
  // The initator(s) attach here cryptographic proof that they are whom they claim they are.
  initiators: IIdentityProof[];

  // One or more targets for being on the other end of the transaction as one more more participants.
  // The targets provide their [[IIdentityProof]]s in the response if they accepted the transaction proposal to begin.
  targets: Identity[];
}

export interface TransactionAcceptance {

}

export interface ApiRequest<TransactionProposal> {
  // The version of Hyperledger Cactus protocol that the calling client is intending on using.
  // If the server does not support it, it must reject the request with a payload
  // providing a list of acceptible protocol versions that are acceptable.
  protocolVersion: number;

  // UUID for correlating a given request to it's response reliably
  correlationId: string;

  // An array of transaction proposals to support batch execution by default
  proposals: TransactionProposal[];
}

export interface ApiResponse<TransactionProposal> {
  // The version of Hyperledger Cactus protocol that the calling client is intending on using.
  // If the server does not support it, it must reject the request with a payload
  // providing a list of acceptible protocol versions that are acceptable.
  protocolVersion: number;

  // UUID for correlating a given request to it's response reliably.
  // Server is responsible for setting this to the originating request's
  // correlation ID ensuring that caller can identify the matching request.
  correlationId: string;
}
