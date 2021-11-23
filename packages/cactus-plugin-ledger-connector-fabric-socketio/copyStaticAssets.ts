/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */
import * as shell from "shelljs";
shell.cp("-R", "src/main/typescript/common/core/CA/", "./dist/common/core");
shell.cp(
  "-R",
  "src/main/typescript/common/core/validatorKey/",
  "./dist/common/core"
);
shell.cp("src/main/typescript/connector/connection.json", "./dist/connector");
