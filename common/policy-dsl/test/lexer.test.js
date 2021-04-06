/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'ava'
import antlr4 from 'antlr4'
import PolicyLexer from "../parser/PolicyLexer.js"
import MyErrorListener from "./MyErrorListener.js"

test("Lexer: Basic boolean expression", t => {
    const res = tokenize('org1 && org2')
    t.deepEqual(res.tokens, [ "ID", "AND", "ID", "EOF"])
})

test("Lexer: Expression with count", t => {
    const res = tokenize('org1 || count > 2')
    t.deepEqual(res.tokens, [ "ID", "OR", "COUNT", "GREATER_THAN", "INTLIT", "EOF"])
})

test("Lexer: Chained expressions", t => {
    const res = tokenize('org1 && org2 || org3')
    t.deepEqual(res.tokens, [ "ID", "AND", "ID", "OR", "ID", "EOF"])
})

test("Lexer: Invalid token", t => {
    const res = tokenize('org1 & org2 || org3')
    t.true(res.errors.length === 1)
})

const tokenize = (input) => {
    // create tokenizer
    const chars = new antlr4.InputStream(input);
    const lexer = new PolicyLexer(chars);
    const tokens  = new antlr4.CommonTokenStream(lexer);

    // Add error handler
    lexer.removeErrorListeners()
    const errorListener = new MyErrorListener()
    lexer.addErrorListener(errorListener)

    // tokenize the input https://stackoverflow.com/a/30676622
    tokens.fill()

    const ts =  tokens.tokens.map(tok => {
        if (tok.type === -1) {
            return "EOF"
        } else {
            return PolicyLexer.ruleNames[tok.type - 1]
        }
    })

    return {
        tokens: ts,
        errors: errorListener.result
    }
}

