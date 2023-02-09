/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// This visitor generates the Abstract Syntax Tree that is constructed as a result
// of parsing, and while walking the parser tree. It is a more abstract version of what is
// parsed, which is more suitable for static analysis

import PolicyParser from "../parser/PolicyParser.js"

// Generic Node object that all nodes are based off
export class Node {
    constructor() {
        this.children = []
        this.value = undefined
    }

    addChild(node) {
        this.children.push(node)
    }

    accept(visitor) {
        visitor.visit(this)
        this.children.forEach((c) => c.accept(visitor))
    }
}

export class RootNode extends Node {}
export class BooleanExpressionNode extends Node {}
export class IDNode extends Node {}
export class CountExpressionNode extends Node {}
export class CountNode extends Node {}
export class CountOperatorNode extends Node {}
export class IntNode extends Node {}

export default class Visitor {
    constructor() {
        this.root = null
        this.stack = []
    }

    printTreePreOrder(node) {
        const output = []

        // function to recursively traverse tree
        const f = (node) => {
            if (node.children) {
                node.children.forEach((child) => {
                    output.push(
                        [
                            child.constructor.name,
                            child.value ? child.value : "",
                        ].join(" ")
                    )
                    f(child)
                })
            }
        }
        f(node)
        return output
    }

    pushNode(node) {
        this.stack.push(node)
    }

    popNode() {
        return this.stack.pop()
    }

    peekNode() {
        return this.stack[this.stack.length - 1]
    }

    visitChildren(ctx) {
        if (!ctx) {
            return
        }

        // handle current node
        if (ctx.constructor.name === "RootContext") {
            // Add to the top of the stack
            const rootNode = new RootNode()
            this.root = rootNode
            this.pushNode(rootNode)
        } else if (
            ctx.constructor.name === "BooleanAndExpressionContext" ||
            ctx.constructor.name === "BooleanOrExpressionContext"
        ) {
            // check if a node needs to be popped off the stack.
            // If the current nodes parent (node at end of stack) already has 1 child that
            // is another BooleanExpression or CountExpression then that means we are going
            // down a new branch and need to pop a node off the stack
            const parentNode = this.peekNode()
            if (
                parentNode.children.length === 1 &&
                (parentNode.children[0].constructor.name ===
                    "BooleanExpressionNode" ||
                    parentNode.children[0].constructor.name ===
                        "CountExpressionNode")
            ) {
                this.popNode()
            }

            // Add node as a child to the node at the top of the stack,
            // this will either be the RootNode or another BooleanExpressionNode
            const n = new BooleanExpressionNode()
            n.value =
                ctx.constructor.name === "BooleanAndExpressionContext"
                    ? "&&"
                    : "||"
            this.stack[this.stack.length - 1].addChild(n)

            // Add to the top of the stack
            this.pushNode(n)
        } else if (ctx.constructor.name === "IdExpressionContext") {
            // Add node as a child to the node at the top of the stack,
            // this will always be a BooleanExpressionNode
            const n = new IDNode()
            n.value = ctx.getText()
            this.stack[this.stack.length - 1].addChild(n)
        } else if (ctx.constructor.name === "CountExpressionContext") {
            // don't need to do anything here, since its all handled in
            // Count_expressionContext
            // return
        } else if (ctx.constructor.name === "Count_expressionContext") {
            // check if a node needs to be popped off the stack.
            // If the current nodes parent (node at end of stack) already has 1 child that
            // is another BooleanExpression or CountExpression then that means we are going
            // down a new branch and need to pop a node off the stack
            const parentNode = this.peekNode()
            if (
                parentNode.children.length === 1 &&
                (parentNode.children[0].constructor.name ===
                    "BooleanExpressionNode" ||
                    parentNode.children[0].constructor.name ===
                        "CountExpressionNode")
            ) {
                this.popNode()
            }

            // Add node as a child to the node at the top of the stack,
            // this will either be the RootNode or a BooleanExpressionNode
            const n = new CountExpressionNode()
            // this value won't be used for static analysis, it's just set for printing/debugging
            n.value = ctx.getText()
            this.stack[this.stack.length - 1].addChild(n)

            // Add to the top of the stack
            this.pushNode(n)
        } else {
            console.error("UNKNOWN NODE TYPE")
            return
        }

        // keep traversing tree
        if (ctx.children) {
            ctx.children.forEach((child) => {
                child.accept(this)
            })
        }
    }

    visitTerminal(node) {
        // only need to look at terminal nodes for a count expression.
        // All other terminal nodes are duplicates since they are unique
        // expression in the Policy grammar (i.e. Have alt labels that generate
        // nodes)
        if (node.symbol && node.symbol.type === PolicyParser.COUNT) {
            // Add node as a child to the node at the top of the stack,
            // this will always be a CountExpressionNode
            const n = new CountNode()
            n.value = node.getText()
            this.stack[this.stack.length - 1].addChild(n)
        } else if (node.symbol && node.symbol.type === PolicyParser.INTLIT) {
            // Add node as a child to the node at the top of the stack,
            // this will always be a CountExpressionNode
            const n = new IntNode()
            n.value = node.getText()
            this.stack[this.stack.length - 1].addChild(n)
        } else if (
            node.symbol &&
            (node.symbol.type === PolicyParser.GREATER_THAN ||
                node.symbol.type === PolicyParser.GREATER_THAN_EQUAL ||
                node.symbol.type === PolicyParser.LESS_THAN ||
                node.symbol.type === PolicyParser.LESS_THAN_EQUAL ||
                node.symbol.type === PolicyParser.EQUAL)
        ) {
            // Add node as a child to the node at the top of the stack,
            // this will always be a CountExpressionNode
            const n = new CountOperatorNode()
            n.value = node.getText()
            this.stack[this.stack.length - 1].addChild(n)
        }
        return
    }
    visitErrorNode(node) {
        console.log("visiting error node")
        return
    }
    visit(node) {
        console.log("omg hi", node.getText())
    }
}
