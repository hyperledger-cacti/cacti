const fs = require("fs");

const targetFile =
  "../../dist/packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BLP_config.js";
const srcStr = '"../BusinessLogicCheckEthereumValidator"';
const distStr =
  '"../../../../../../examples/cactus-check-connection-ethereum-validator/BusinessLogicCheckEthereumValidator"';

fs.readFile(targetFile, "utf8", (readErr, data) => {
  if (readErr) {
    return console.log(readErr);
  }
  const result = data.replace(srcStr, distStr);

  fs.writeFile(targetFile, result, "utf8", (writeErr) => {
    if (writeErr) return console.log(writeErr);
  });
});
