declare module "web3js-quorum" {
  import { PastLogsOptions} from "web3-core";
  import type Web3 from "web3";
  import type {TransactionConfig, Eth} from "web3-eth";
  import type {Utils} from "web3-utils";
  import * as Buffer from "buffer";
  
    export default function Web3Quorum(web3: IWeb3Instance, enclaveOptions?: EnclaveOptions, isQuorum?: boolean): IWeb3Quorum;
  
    export interface IWeb3Instance {
      currentProvider: any;
      extend: (...args: any[]) => any;
  }
  
  export interface IWeb3Quorum extends Web3 {
    utils: IUtilsWeb3;
    ptm: IPtm
    priv: IPrivWeb3;
    eth: IEthWeb3;
    raft: IRaftWeb3;
    istanbul: IIstanbulWeb3;
    permission: IPermissionWeb3;
  }
  
  export interface EnclaveOptions {
    /**
     *      absolute file path to the ipc of the transaction manager
     */
    ipcPath: string
    /**
     *   http url to the transaction manager
     */
    privateUrl: string
    /**
     * TLS configuration for the transaction manager when using HTTPS in privateUrl
     *
     */
    tlsSettings: TlsSettings
  }
  
  export interface TlsSettings {
    /**
     * client key buffer
     */
    key: Buffer
    /**
     * client certificate buffer
     */
    clcert: Buffer
    /**
     * CA certificate buffer
     */
    cacert: Buffer
    allowInsecure: boolean
  }
  
  export interface IUtilsWeb3 extends Utils {
    /**
     * Generate a privacyGroupId
     */
    generatePrivacyGroup(options: IPrivacyOptions): string
  
    /**
     * @function setPrivate
     */
    setPrivate(rawTransaction: string): Buffer
  }
  
  export interface IPrivacyOptions {
    readonly privateFor: string[];
    readonly privateFrom: string;
  }
  
  export interface IPtm {
    send(options: IPtmSend): Promise<string>
  
    storeRaw(options: IPtmStoreRaw): Promise<string>
  
    keys(): Promise<string[]>
  
    partyInfoKeys(): Promise<string[]>
  
    upCheck(): Promise<string>
  }
  
  export interface IPtmSend extends IOptions {
    readonly privateFor: string;
  }
  
  // export interface IPtmStoreRaw extends IOptions {
  // }
  
  interface IOptions {
    readonly data: string;
    readonly privateFrom: string;
  }
  
  export interface IPrivWeb3 {
    call(privacyGroupId: string, call: TransactionConfig, blockNumber?: string): Promise<string>
  
    debugGetStateRoot(privacyGroupId: string, blockNumber: string | number): Promise<string>
  
    distributeRawTransaction(transaction: string): Promise<string>;
  
    /**
     * Send the Raw transaction to the Besu node
     */
    sendRawTransaction(transaction: string): Promise<string>;
  
    getEeaTransactionCount(address: string, sender: string, recipients: string[]): Promise<string>
  
    getFilterChanges(privacyGroupId: string, filterId: string): Promise<ILogObject[]>
  
    getFilterLogs(privacyGroupId: string, filterId: string): Promise<ILogObject[]>
  
    getLogs(privacyGroupId: string, filterOptions: PastLogsOptions): Promise<ILogObject[]>
  
    getPrivacyPrecompileAddress(): Promise<string>
  
    getPrivateTransaction(transaction: string): Promise<IPrivateTransactionObject>
  
    getTransactionCount(address: string, privacyGroupId: string): Promise<number>;
  
    /**
     * Get the private transaction Receipt.
     * @param {String} transactionHash 32-byte hash of a transaction
     */
    getTransactionReceipt(transactionHash: string): Promise<IPrivateTransactionReceipt | null>;
  
    getCode(privacyGroupId: string, address: string, blockNumber: string | number): Promise<string>
  
    newFilter(privacyGroupId: string, filter: PastLogsOptions): Promise<string>;
  
    uninstallFilter(privacyGroupId: string, filter: PastLogsOptions): Promise<boolean>;
  
    /**
     * Creates an on chain privacy group
     */
    createPrivacyGroup(options: ICreatePrivacyGroupOptions): Promise<string>;
  
    /**
     * Returns with the deleted group's ID (same one that was passed in).
     */
    deletePrivacyGroup(privacyGroupId: string): Promise<string>;
  
    /**
     * Returns a list of privacy groups containing only the listed members.
     * For example, if the listed members are A and B, a privacy group
     * containing A, B, and C is not returned.
     */
    findPrivacyGroup(members: string[]): Promise<IPrivacyGroup[]>;
  
    subscribe(privacyGroupId: string, type: string, filter: unknown): Promise<string>;
  
    unsubscribe(privacyGroupId: string, subscriptionId: string): Promise<boolean>;
  
    waitForTransactionReceipt(txHash: string, retries?: number, delay?: number): Promise<IPrivateTransactionReceipt>
  
    generateAndDistributeRawTransaction(options: IDistributeRawTransaction): Promise<string>
  
    generateAndSendRawTransaction(options: ISendRawTransaction): Promise<string>
  
    subscribeWithPooling(privacyGroupId: string, filter: unknown, callback: (error, result) => any): Promise<unknown>
  }
  
  export interface IPrivacyGroup {
    readonly privacyGroupId: string;
    readonly type: PrivacyGroupType;
    readonly name: string;
    readonly description: string;
    readonly members: string[];
  }
  
  export const enum PrivacyGroupType {
    LEGACY,
    ONCHAIN,
    PANTHEON
  }
  
  export interface ICreatePrivacyGroupOptions {
    readonly addresses: string[];
    readonly name?: string;
    readonly description?: string;
  }
  
  interface IBasicPrivateTransaction {
    /**
     * Data, 20 bytes  Address of the sender.
     */
    readonly from: string;
    /**
     * Data, 20 bytes  Address of the receiver, if sending ether, otherwise, null.
     */
    readonly to: string;
    /**
     * Data, 32 bytes  Tessera public key of the sender.
     */
    readonly privateFrom: string;
    /**
     * or privacyGroupId  Array or Data, 32 bytes  Tessera public keys or privacy group ID of the recipients.
     */
    readonly privateFor: string | string[];
  }
  
  export interface IPrivateTransactionReceipt extends IBasicPrivateTransaction {
    /**
     * Data, 32 bytes  Hash of block containing this transaction.
     */
    readonly blockHash: string;
    /**
     * Quantity  Block number of block containing this transaction.
     */
    readonly blockNumber: number;
    /**
     * Data, 20 bytes  Contract address created if a contract creation transaction, otherwise, null.
     */
    readonly contractAddress: string;
    /**
     * Array  Array of log objects generated by this private transaction.
     */
    readonly logs: Array<ILogObject>;
    /**
     * Data, 256 bytes  Bloom filter for light clients to quickly retrieve related logs.
     */
    readonly logsBloom: string;
    /**
     * Data, 32 bytes  Hash of the private transaction.
     */
    readonly transactionHash: string;
    /**
     * Quantity, Integer  Index position of transaction in the block.
     */
    readonly transactionIndex: number;
    /**
     * Quantity  Either `0x1` (success) or `0x0` (failure).
     */
    readonly status: boolean;
    /**
     * String  ABI - encoded string that displays the reason for reverting the transaction.Only available if revert reason is enabled.
     */
    readonly revertReason: string;
    /**
     * Data  RLP - encoded return value of a contract call if a value returns, otherwise, null.
     */
    readonly output: string;
    /**
     * Data, 32 bytes  Hash of the privacy marker transaction.
     */
    readonly commitmentHash: string;
  
    readonly gasUsed: number;
  }
  
  export interface IPrivateTransactionObject extends IBasicPrivateTransaction {
    readonly gas: number;
    readonly gasPrice: number;
    readonly input: string;
    readonly nonce: number;
    readonly value: number;
    readonly v: number;
    readonly r: string;
    readonly s: string;
    readonly privacyGroupId: string;
    readonly restriction: string;
  }
  
  /**
   * @see https://besu.hyperledger.org/en/stable/Reference/API-Objects/#log-object
   */
  export interface ILogObject {
    /**
     * Tag  true if log removed because of a chain reorganization.false if a valid log.
     */
    readonly removed: string;
    /**
     * Quantity, Integer  Log index position in the block.null when log is pending.
     */
    readonly logIndex: number;
    /**
     * Quantity, Integer  Index position of the starting transaction for the log.null when log is pending.
     */
    readonly transactionIndex: number;
    /**
     * Data, 32 bytes  Hash of the starting transaction for the log.null when log is pending.
     */
    readonly transactionHash: string;
    /**
     * Data, 32 bytes  Hash of the block that includes the log.null when log is pending.
     */
    readonly blockHash: string;
    /**
     * Quantity  Number of block that includes the log.null when log is pending.
     */
    readonly blockNumber: number;
    /**
     * Data, 20 bytes  Address the log originated from.
     */
    readonly address: string;
    /**
     * Data  Non - indexed arguments of the log.
     */
    readonly data: string;
    /**
     * Array of Data, 32 bytes each  Event signature hash and 0 to 3 indexed log arguments.
     */
    readonly topics: string[];
  }
  
  export interface IDistributeRawTransaction {
    readonly privateKey: string;
    readonly privateFrom: string;
    readonly privateFor: string[];
    readonly privacyGroupId?: string;
    readonly nonce?: number;
    readonly to?: string;
    readonly data: string;
  }
  
  export interface ISendRawTransaction extends IDistributeRawTransaction {
    readonly gasLimit?: string;
    readonly gasPrice?: string;
  }
  
  export interface IEthWeb3 extends Eth {
    flexiblePrivacyGroup: IFlexiblePrivacyGroup
    sendRawPrivateTransaction(signed: string, privateData: IPrivateData): Promise<string>
  
    fillTransaction(tx: ITransaction): Promise<{ raw: string, tx: IPrivateTransactionObject }>
  
    storageRoot(address: string, block?: string): Promise<string>
  
    getQuorumPayload(id: string): Promise<string>
  
    sendTransactionAsync(tx: ITransaction): Promise<string>
  
    getContractPrivacyMetadata(contractAddress: string): Promise<IContractPrivacyMetadata>
  
    distributePrivateTransaction(privateTx: string, privateData: IDistributePrivateData): Promise<string>
  
    getPrivacyPrecompileAddress(): Promise<string>
  
    getPrivateTransactionByHash(hash: string): Promise<IPrivateTransactionReceipt>
  
    getPrivateTransactionReceipt(hash: string): Promise<IPrivateTransactionReceipt>
  
    getPSI(): Promise<string>
  
    sendGoQuorumTransaction(tx: TransactionConfig): Promise<IPrivateTransactionReceipt>
  }
  
  export interface IFlexiblePrivacyGroup {
    find(enclaveKeys: string[]): Promise<IPrivacyGroup[]>
    getParticipants({privacyGroupId: string}): Promise<string[]>
    create(options: ICreateFlexiblePrivacyGroup): Promise<IPrivateTransactionReceipt>
    removeFrom(options: IRemoveFromFlexiblePrivacyGroup): Promise<IPrivateTransactionReceipt>
    setLockState(options: ISetLockStateFlexiblePrivacyGroup): Promise<IPrivateTransactionReceipt>
    addTo(options: ICreateFlexiblePrivacyGroup): Promise<IPrivateTransactionReceipt>
  }
  
  export interface IBaseFlexiblePrivacyGroup {
    readonly privacyGroupId: string
    readonly privateKey: string
    readonly enclaveKey: string
  }
  export interface ICreateFlexiblePrivacyGroup extends IBaseFlexiblePrivacyGroup {
    readonly participants: string[]
  }
  
  export interface IRemoveFromFlexiblePrivacyGroup extends IBaseFlexiblePrivacyGroup {
    readonly participants: string
  }
  
  export interface ISetLockStateFlexiblePrivacyGroup extends IBaseFlexiblePrivacyGroup {
    readonly lock: boolean
  }
  
  export interface IPrivateData {
    readonly privacyFlag: PrivacyFlag;
    readonly privateFor: string[];
    readonly mandatoryFor: string[];
  }
  
  export interface IDistributePrivateData extends IPrivateData {
    readonly privateFrom: string[];
  }
  
  export const enum PrivacyFlag {
    SP,
    PP,
    MPP,
    PSV
  }
  
  export interface ITransaction {
    readonly from: string;
    readonly to?: string;
    readonly value?: number;
    readonly data?: string;
    readonly privateFor?: string[];
  }
  
  export interface IContractPrivacyMetadata {
    readonly creationTxHash: string;
    readonly privacyFlag: PrivacyFlag;
    readonly mandatoryFor: string[];
  }
  
  export interface IRaftWeb3 {
    cluster(): Promise<ICluster[]>
  
    role(): Promise<RaftRole>
  
    leader(): Promise<string>
  
    addPeer(enodeId: string): Promise<number>
  
    removePeer(raftId: number): Promise<null>
  
    addLearner(enodeId: string): Promise<number>
  
    promoteToPeer(raftId: number): Promise<boolean>
  }
  
  export interface ICluster {
    readonly hostName: string;
    readonly nodeActive: boolean;
    readonly nodeId: string;
    readonly p2pPort: number;
    readonly raftId: string;
    readonly raftPort: number;
    readonly role: RaftRole;
  }
  
  export const enum RaftRole {
    Minter = "minter",
    Verifier = "verifier",
    Learner = "learner"
  }
  
  export interface IIstanbulWeb3 {
    discard(address: string): Promise<null>
  
    propose(address: string, auth: boolean): Promise<null>
  
    getValidatorsAtHash(blockHash: string): Promise<string[]>
  
    getValidators(block: string | number): Promise<string[]>
  
    candidates(): Promise<{[address: string]: boolean}>
  
    getSnapshot(block: string | number): Promise<unknown>
  
    getSnapshotAtHash(blockHash: string): Promise<unknown>
  
    nodeAddress(): Promise<string>
  
    getSignersFromBlock(block: number): Promise<unknown>
  
    getSignersFromBlockByHash(block: string): Promise<unknown>
  
    status(startBlock: number, endBlock: number): Promise<unknown>
  
    isValidator(block: number): Promise<boolean>
  }
  
  export interface IPermissionWeb3 {
    orgList(): Promise<unknown[]>
  
    acctList(): Promise<unknown[]>
  
    nodeList(): Promise<unknown[]>
  
    roleList(): Promise<unknown[]>
  
    getOrgDetails(orgId: string): Promise<unknown[]>
  
    addOrg(orgId: string, enodeId: string, accountId: string): Promise<string>
  
    approveOrg(orgId: string, enodeId: string, accountId: string): Promise<string>
  
    updateOrgStatus(orgId: string, action: number): Promise<string>
  
    approveOrgStatus(orgId: string, action: number): Promise<string>
  
    addSubOrg(parentOrgId: string, subOrgId: string, enodeId: string): Promise<unknown[]>
  
    addNewRole(orgId: string, roleId: string, accountAccess: string, isVoter: boolean, isAdminRole: boolean): Promise<string>
  
    removeRole(orgId: string, roleId: string): Promise<string>
  
    addAccountToOrg(acctId: string, orgId: string, roleId: string): Promise<string>
  
    changeAccountRole(acctId: string, orgId: string, roleId: string): Promise<string>
  
    updateAccountStatus(orgId: string, acctId: string, action: string): Promise<string>
  
    recoverBlackListedAccount(orgId: string, acctId: string): Promise<string>
  
    approveBlackListedAccountRecovery(orgId: string, acctId: string): Promise<string>
  
    assignAdminRole(orgId: string, acctId: string, roleId: string): Promise<string>
  
    approveAdminRole(orgId: string, acctId: string): Promise<string>
  
    addNode(orgId: string, enodeId: string): Promise<string>
  
    updateNodeStatus(orgId: string, enodeId: string, action: string): Promise<string>
  
    recoverBlackListedNode(orgId: string, enodeId: string): Promise<string>
  
    approveBlackListedNodeRecovery(orgId: string, enodeId: string): Promise<string>
  
    transactionAllowed(tx: TransactionConfig): Promise<boolean>
  
    connectionAllowed(enodeId: string, ip: string, port: number): Promise<boolean>
  }
  }