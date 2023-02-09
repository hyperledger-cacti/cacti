/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Basic helper functions.
 **/
/** End file docs */
import { promisify } from "util";
// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
        .then((data) => {
            const response: [T?, Error?] = [data, undefined];
            return response;
        })
        .catch((error) => Promise.resolve([undefined, error]));
    return result;
}

// Necessary until gRPC provides a native async friendly solution https://github.com/grpc/grpc-node/issues/54
function promisifyAll(client: any): any {
    const to = {};
    // // eslint-disable-next-line
    for (const k in client) {
        // eslint-disable-next-line
        if (typeof client[k] !== "function") continue
        to[k] = promisify(client[k].bind(client));
    }
    return to;
}
/**
 * Parses address string into location, view and network segments.
 * @param address
 **/
function parseAddress(address: string): { locationSegment: string; viewSegment: string; networkSegment: string } {
    const addressList = address.split("/");
    if (addressList.length !== 3) {
        throw new Error("Invalid address string");
    }
    return {
        locationSegment: addressList[0],
        networkSegment: addressList[1],
        viewSegment: addressList[2],
    };
}

export { handlePromise, promisifyAll, parseAddress };
