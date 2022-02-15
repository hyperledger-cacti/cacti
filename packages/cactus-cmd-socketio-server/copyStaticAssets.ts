/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */

import * as shell from "shelljs";

shell.cp(
  "-R",
  "./src/main/typescript/verifier/validatorKey/",
  "./dist/src/main/typescript/verifier/",
);

shell.cp("../../yarn.lock", "./dist");
