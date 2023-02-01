/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import antlr4 from 'antlr4';
import PolicyLexer from "./parser/PolicyLexer.js"
import PolicyParser from "./parser/PolicyParser.js"

var input = 'org1 && org2'
var chars = new antlr4.InputStream(input);
var lexer = new PolicyLexer(chars);
var tokens  = new antlr4.CommonTokenStream(lexer);
tokens.fill()
tokens.tokens.forEach(tok => {
    console.log(tok.text);
})
