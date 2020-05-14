
declare module "web3-eea" {

    export default function EEAClient(web3: IWeb3Instance, chainId: number): IWeb3InstanceExtended;

    export interface IWeb3Instance {
        currentProvider: any;
        extend: (...args: any[]) => any;
    }

    export interface IEeaWeb3Extension {
        sendRawTransaction: (...args: any[]) => any
    }

    export interface IWeb3InstanceExtended extends IWeb3Instance {
        eea: IEeaWeb3Extension;
    }
}

