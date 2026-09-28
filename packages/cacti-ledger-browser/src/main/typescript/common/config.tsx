import ethBrowserAppDefinition from "../apps/eth";
import fabricBrowserAppDefinition from "../apps/fabric";
import tutorialAppDefinition from "../apps/tutorial-app";
import satpInspectorAppDefinition from "../apps/satp";
import { AppDefinition } from "./types/app";

const config = new Map<string, AppDefinition>([
  ["ethereumPersistenceBrowser", ethBrowserAppDefinition],
  ["fabricPersistenceBrowser", fabricBrowserAppDefinition],
  ["tutorialApplication", tutorialAppDefinition],
  ["satpInspector", satpInspectorAppDefinition],
]);

export default config;
