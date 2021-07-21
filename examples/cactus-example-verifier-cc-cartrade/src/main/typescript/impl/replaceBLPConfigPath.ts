/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReplacePath.js
 */
import fs from "fs";

const targetFile = "../../dist/packages/config/BLP_config.js";
const srcStr = '"../BusinessLogicCartrade"';
const distStr = '"../../examples/cartrade/BusinessLogicCartrade"';

fs.readFile(targetFile, "utf8", (readErr: any, data: any) => {
  if (readErr) {
    return console.log(readErr);
  }
  const result = data.replace(srcStr, distStr);

  fs.writeFile(targetFile, result, "utf8", (writeErr: any) => {
    if (writeErr) return console.log(writeErr);
  });
});
