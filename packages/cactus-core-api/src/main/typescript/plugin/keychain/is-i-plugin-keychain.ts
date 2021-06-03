import { IPluginKeychain } from "./i-plugin-keychain";

export function isIPluginKeychain(x: unknown): x is IPluginKeychain {
  return (
    !!x &&
    typeof (x as IPluginKeychain).delete === "function" &&
    typeof (x as IPluginKeychain).get === "function" &&
    typeof (x as IPluginKeychain).getInstanceId === "function" &&
    typeof (x as IPluginKeychain).getKeychainId === "function" &&
    typeof (x as IPluginKeychain).getPackageName === "function" &&
    typeof (x as IPluginKeychain).has === "function" &&
    typeof (x as IPluginKeychain).set === "function"
  );
}
