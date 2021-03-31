export type Query = {
    ccArgs: string[];
    channel: string;
    ccFunc: string;
    contractName: string;
};
export type InteropJSON = {
    address?: string;
    ChaincodeFunc?: string;
    ChaincodeID?: string;
    ChannelID?: string;
    RemoteEndpoint?: string;
    NetworkID?: string;
    Sign: boolean;
    ccArgs?: string[];
};

export type RemoteJSON = {
    LocalRelayEndpoint: string;
    interopJSON: {
        [key: string]: InteropJSON;
    };
};
