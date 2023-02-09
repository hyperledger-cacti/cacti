/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { HashMechanism } from "@hyperledger-labs/weaver-protos-js/common/asset_locks_pb";

/*
 * Interface for all hash functions to be used for HTLC
 * To extend supported hash functions in weaver for HTLC,
 * implement following interface, along with adding the same in
 * interopcc. If Hash has more than one element, create a protobuf for it,
 * and serialize the protobuf in base64 in getSerializedHashBase64 function.
 */
interface Hash {
    HASH_MECHANISM: HashMechanism
    preimage: any           // Preimage for Hash
    hash64: string          // Serialized Hash in base64
    generateRandomPreimage(length): void;
    setPreimage(preimage: any): void;
    getPreimage(): any;
    getSerializedPreimageBase64(): string;
    setSerializedHashBase64(hash64: string): void;
    getSerializedHashBase64(): string;
}

abstract class SHA implements Hash {
    abstract HASH_MECHANISM: HashMechanism
    preimage: string = null;
    hash64: string = null;
    
    abstract computeHash(): string
    
    // Create a secure pseudo-random preimage of a given length
    generateRandomPreimage(length)
    {
        this.setPreimage(crypto.randomBytes(length).toString('base64'));
    }
    
    setPreimage(preimage: string) {
        this.preimage = preimage
        this.hash64 = this.computeHash()
    }
    getPreimage(): string {
        return this.preimage;
    }
    getSerializedPreimageBase64(): string {
        return Buffer.from(this.preimage).toString('base64')
    }
    
    setSerializedHashBase64(hash64: string) {
        this.hash64 = hash64;
    }
    getSerializedHashBase64(): string {
        if(this.hash64 != null)
            return this.hash64
        else
            throw new Error(`Error: Hash or Preimage needs to be set before access`);
    }
}

/*
 * SHA256 Hash for HTLC, implementing above Hash Interface
 */
class SHA256 extends SHA {
    HASH_MECHANISM = HashMechanism.SHA256;
    
    computeHash(): string {
        return crypto.createHash('sha256').update(this.preimage).digest('base64');
    }
}
/*
 * SHA512 Hash for HTLC, implementing above Hash Interface
 */
class SHA512 extends SHA {
    HASH_MECHANISM = HashMechanism.SHA512;
    
    computeHash(): string {
        return crypto.createHash('sha512').update(this.preimage).digest('base64');
    }
}

export {
    Hash,
    SHA256,
    SHA512
};
