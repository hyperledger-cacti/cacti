/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * copyStaticAssets.ts
 */
import * as shell from "shelljs";
shell.cp("config/default.js", "./dist/config");
