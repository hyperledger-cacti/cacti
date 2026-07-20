import fs from "fs";
import inquirer from "inquirer";
import { ConfigService } from "../packages/cactus-cmd-api-server/dist/lib/main/typescript/config/config-service.js";

const main = async () => {
  const configService = new ConfigService();
  const config = await configService.newExampleConfig();
  const configJson = JSON.stringify(config, null, 4).concat("\n");

  try {
    // Atomically create the file only if it does not already exist: the "wx"
    // flag fails with EEXIST rather than overwriting, which removes the
    // check-then-write (TOCTOU) race that a prior fs.existsSync() check had.
    fs.writeFileSync(config.configFile, configJson, { flag: "wx" });
    console.log(`Written generated config to: ${config.configFile}`);
  } catch (ex) {
    if (ex.code !== "EEXIST") {
      throw ex;
    }
    const answers = await inquirer.prompt([
      {
        name: "overwritePreviousConfig",
        type: "confirm",
        message: `Configuration file ${config.configFile} already exists. Overwrite it? (No)`,
        default: false,
      },
    ]);
    if (answers.overwritePreviousConfig) {
      fs.writeFileSync(config.configFile, configJson);
      console.log(`Written generated config to: ${config.configFile}`);
    } else {
      console.log(
        `You opted to not overwrite the previous configuration file at ${config.configFile}, skipping...`,
      );
    }
  }
  const apiServerCmd = `node ./packages/cactus-cmd-api-server/dist/lib/main/typescript/cmd/cactus-api.js --config-file=${config.configFile}`;
  console.log(
    `You can start the Cactus API server with ${config.configFile} by executing this from the project root:`,
  );
  console.log(apiServerCmd);
};

main()
  .then(() => process.exit(0))
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
