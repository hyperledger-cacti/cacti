/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from "gluegun";

const command: GluegunCommand = {
  name: "besu-cli",
  run: async (toolbox) => {
    const { print } = toolbox;

    print.info("Welcome to your CLI");
  },
};

module.exports = command;
