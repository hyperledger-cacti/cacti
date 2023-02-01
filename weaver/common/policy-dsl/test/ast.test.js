/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Tests to check that the AST is correctly generated from the parse tree
// using MyParseTreeVisitor
import test from "ava"

import { parse } from "./Helper.js"
import MyParseTreeVisitor from "./MyParseTreeVisitor.js"

test("AST: Boolean operators", (t) => {
    const res = parse("org1 && org2 || org3")
    t.true(res.errors.length === 0)

    const visitor = new MyParseTreeVisitor()
    res.parserResult.accept(visitor)
    const output = visitor.printTreePreOrder(visitor.root)
    const expected = [
        "BooleanExpressionNode ||",
        "BooleanExpressionNode &&",
        "IDNode org1",
        "IDNode org2",
        "IDNode org3",
    ]

    t.deepEqual(output, expected)
})

test("AST: Count expression", (t) => {
    const res = parse("count > 2")
    t.true(res.errors.length === 0)

    const visitor = new MyParseTreeVisitor()
    res.parserResult.accept(visitor)
    const output = visitor.printTreePreOrder(visitor.root)
    const expected = [
        "CountExpressionNode count>2",
        "CountNode count",
        "CountOperatorNode >",
        "IntNode 2",
    ]

    t.deepEqual(output, expected)
})
