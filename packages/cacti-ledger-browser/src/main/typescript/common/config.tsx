import ethBrowserAppDefinition from "../apps/eth";
import fabricBrowserAppDefinition from "../apps/fabric";
import { AppDefinition } from "./types/app";

const config = new Map<string, AppDefinition>([
  ["ethereumPersistenceBrowser", ethBrowserAppDefinition],
  ["fabricPersistenceBrowser", fabricBrowserAppDefinition],
]);

export default config;
