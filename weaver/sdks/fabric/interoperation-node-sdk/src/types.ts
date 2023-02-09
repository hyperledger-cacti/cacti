/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export type InvocationSpec = {
    ccArgs: string[];
    channel: string;
    ccFunc: string;
    contractName: string;
};

export type Flow = {
    flowArgs: string[];
    cordappAddress: string;
    flowId: string;
    cordappId: string;
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
    viewRequests: {
        [key: string]: {
            invokeArgIndices: Array<number>;
            interopJSONs: Array<InteropJSON>;
        };
    };
};
