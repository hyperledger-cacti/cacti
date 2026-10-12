import ethBrowserAppDefinition from "../apps/eth";
import fabricBrowserAppDefinition from "../apps/fabric";
import satpAppDefinition from "../apps/satp";
import tutorialAppDefinition from "../apps/tutorial-app";
import { AppDefinition } from "./types/app";

const config = new Map<string, AppDefinition>([
  ["ethereumPersistenceBrowser", ethBrowserAppDefinition],
  ["fabricPersistenceBrowser", fabricBrowserAppDefinition],
  ["satpInspector", satpAppDefinition],
  ["tutorialApplication", tutorialAppDefinition],
]);

export default config;
