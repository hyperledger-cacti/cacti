/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "ava"

import { parse } from "./Helper.js"

test("Parser: Boolean operators", (t) => {
    const res = parse("org1 && org2 || org3")

    t.true(res.errors.length === 0)
})

test("Parser: All expressions", (t) => {
    const res = parse("org1 && org2 && org3 || count > 3")

    t.true(res.errors.length === 0)
})

test("Parser: Count expression", (t) => {
    const res = parse("count > 2")

    t.true(res.errors.length === 0)
})

test("Parser: Invalid syntax", (t) => {
    const res = parse("org1 && count")

    t.true(res.errors.length === 1)
})
