/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

function checkIfArraysAreEqual(x: Array<any>, y: Array<any>): boolean {
    if (x == y) {
        return true;
    } else if (x == null || y == null || (x.length != y.length)) {
        return false;
    } else {
        // check if all elements of x are present in y 
        for (const element of x) {
            const index = y.indexOf(element);
            if (index == -1) {
                return false;
            } else {
                y.splice(index, 1);
            }
        }
        
        // return false if y has additional elements not in x
        if (y.length != 0) {
            return false;
        }
    }

    return true;
}

// handle callback
function relayCallback(err: any, response: any) {
    if (response) {
        console.log(`Response: ${JSON.stringify(response.toObject())}`);
    } else if (err) {
        console.log(`Error: ${JSON.stringify(err)}`);
    }
}

// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
      .then(data => {
        const response: [T?, Error?] = [data, undefined]
        return response
      })
      .catch(error => Promise.resolve([undefined, error]))
    return result
}

export {
    checkIfArraysAreEqual,
    handlePromise,
    relayCallback
}