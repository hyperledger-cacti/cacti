/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * rif-util.test.ts
 */

import { RIFUtil } from "../../../main/typescript/routing-interface/util/RIFUtil";

test("test", () => {
  const objJson = { aaa: "abc", bbb: "def" };
  const strJson = JSON.stringify(objJson);
  expect(RIFUtil.json2str(objJson)).toBe(strJson);
  expect(RIFUtil.json2str(RIFUtil.str2json(strJson) as object)).toBe(strJson);
  expect(RIFUtil.str2json("abc")).toBeNull(); // for invalid value.
});
