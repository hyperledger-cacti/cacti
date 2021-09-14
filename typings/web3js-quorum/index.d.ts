declare module "web3js-quorum" {
    import type Web3 from "web3";

    /**
     * @param web3 The web3 instance that will be extended at runtime with the
     * web3js-quorum functionality.
     * @param enclaveOptions Must contain either `ipcPath` or `privateUrl`
     * @param isQuorum Defaults to `false`
     */
    export default function Web3JsQuorum(web3: IWeb3Instance, enclaveOptions: IEnclaveOptions, isQuorum?: boolean): IWeb3InstanceExtended;

    export interface IWeb3Instance {
        currentProvider: any;
        extend: (...args: any[]) => any;
    }

    export interface IEeaWeb3Extension {
        /**
         * Send the Raw transaction to the Besu node
         */
        sendRawTransaction: (options: unknown) => Promise<string>;
    }

    export interface IWeb3InstanceExtended extends Web3 {
        priv: IPrivWeb3Extension;
    }
    export interface IPrivWeb3Extension {
        /**
         * Generate a privacyGroupId
         * @param options Options passed into `eea_sendRawTransaction`
         * @returns String The base64 encoded keccak256 hash of the participants.
         */
        createPrivacyGroup(options: unknown): string;
    }

    export type IEnclaveOptions = IEnclaveEndpointOptions & {
        readonly tlsSettings?: ITlsSettings;
    }

    /**
     * configuration options of the transaction manager required for GoQuorum case only
     */
    export type IEnclaveEndpointOptions = IEnclavePrivateUrlOptions | IEnclaveIpcOptions;

    /**
     * configuration options of the transaction manager required for GoQuorum case only
     */
    export interface IEnclavePrivateUrlOptions {
        /**
         * http url to the transaction manager
         */
        readonly privateUrl: string;
    }

    /**
     * configuration options of the transaction manager required for GoQuorum case only
     */
    export interface IEnclaveIpcOptions {
        /**
         *    absolute file path to the ipc of the transaction manager
         */
        readonly ipcPath: string;
    }

    /**
     * TLS configuration for the transaction manager when using HTTPS in privateUrl
     */
    export type ITlsSettings = ISecureTlsSettings | IUnSecuredTlsSettings;

    /**
     * TLS configuration for the transaction manager when using HTTPS in privateUrl
     */
    export type ISecureTlsSettings = {
        /**
         * client key buffer
         */
        readonly key: Buffer;
        /**
         * client certificate buffer
         */
        readonly clcert: Buffer;
        /**
         * CA certificate buffer
         */
        readonly cacert: Buffer;

        readonly allowInsecure?: boolean;
    }

    /**
     * TLS configuration for the transaction manager when using HTTPS in privateUrl
     */
    export type IUnSecuredTlsSettings = {
        readonly allowInsecure: true;
    }
}
