/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import antlr4 from "antlr4"

import PolicyLexer from "../parser/PolicyLexer.js"
import PolicyParser from "../parser/PolicyParser.js"
import MyErrorListener from "./MyErrorListener.js"

export const parse = (source) => {
    // create parser
    const chars = new antlr4.InputStream(source)
    const lexer = new PolicyLexer(chars)
    const tokens = new antlr4.CommonTokenStream(lexer)
    const parser = new PolicyParser(tokens)
    parser.buildParseTrees = true

    // Add error handlers
    lexer.removeErrorListeners()
    parser.removeErrorListeners()
    const errorListener = new MyErrorListener()
    lexer.addErrorListener(errorListener)
    parser.addErrorListener(errorListener)

    // parse the input
    const res = parser.root()

    return {
        parserResult: res,
        errors: errorListener.result,
    }
}

// helper function to print the parseTree, for debugging
export const traverseParseTree = (rootCtx) => {
    rootCtx.children?.forEach((c) => {
        console.log(
            c.constructor.name,
            ":",
            c.getText(),
            c.symbol ? c.symbol.type : ""
        )
        traverseParseTree(c)
        console.log("leaving children of: ", c.getText())
    })
}

export default { parse, traverseParseTree }
