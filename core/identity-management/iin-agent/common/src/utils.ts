/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// A better way to handle errors for promises
export function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
        .then((data) => {
            const response: [T?, Error?] = [data, undefined];
            return response;
        })
        .catch((error) => Promise.resolve([undefined, error]));
    return result;
}
