#!/usr/bin/env node

import { ApiServer } from "../api-server";
import { ConfigService } from "../config/config-service";

const main = async () => {
  if (process.argv[2].includes("help")) {
    const helpText = ConfigService.getHelpText();
    // tslint:disable-next-line: no-console
    console.log(helpText);
    const configService = new ConfigService();
    const config = configService.getOrCreate();
    // tslint:disable-next-line: no-console
    console.log(`Effective Configuration:`);
    // tslint:disable-next-line: no-console
    console.log(JSON.stringify(config.getProperties(), null, 4));
  } else {
    const configService = new ConfigService();
    const config = configService.getOrCreate();
    const apiServer = new ApiServer({ config, plugins: [] });
    await apiServer.start();
  }
};

main()
  .then((result) => {
    // tslint:disable-next-line: no-console
    console.log(`Cactus API server launched OK `);
  })
  .catch((ex) => {
    // tslint:disable-next-line: no-console
    console.error(`Cactus API server crashed: `, ex);
    process.exit(1);
  });
