import * as shell from "shelljs";

shell.cp(
  "../../dist/examples/cactus-check-connection-ethereum-validator/config/BLP_config.js",
  "../../dist/packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/",
);
