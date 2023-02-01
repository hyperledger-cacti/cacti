/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The error listener used to capture all parser errors reported by
 * ANTLR and converting these to an array of messages
 */
export default class MyErrorListener {
    constructor() {
        this.result = [];
    }

    syntaxError(recognizer, offendingSymbol, line, column, msg, e) {
        this.result.push({message: msg, errorSrc: recognizer.constructor.name });
    }
}
