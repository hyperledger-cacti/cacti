/* tslint:disable */
/* eslint-disable */
/**
* @returns {Promise<PluginFactoryKeychain>}
*/
export function createPluginFactory(): Promise<PluginFactoryKeychain>;
/**
*/
export class PluginFactoryKeychain {
  free(): void;
/**
*/
  constructor();
/**
* @param {any} options_raw
* @returns {PluginKeychainMemoryWasm}
*/
  create(options_raw: any): PluginKeychainMemoryWasm;
}
/**
*/
export class PluginKeychainMemoryWasm {
  free(): void;
/**
* @param {PluginKeychainMemoryWasmOptions} options
*/
  constructor(options: PluginKeychainMemoryWasmOptions);
/**
* @returns {string}
*/
  getPackageName(): string;
/**
* @returns {string}
*/
  getKeychainId(): string;
/**
* @returns {string}
*/
  getInstanceId(): string;
/**
* @returns {Promise<any>}
*/
  onPluginInit(): Promise<any>;
/**
* @param {string} key
* @returns {Promise<any>}
*/
  get(key: string): Promise<any>;
/**
* @param {string} key
* @param {string} value
* @returns {Promise<any>}
*/
  set(key: string, value: string): Promise<any>;
/**
* @param {string} key
* @returns {Promise<any>}
*/
  has(key: string): Promise<any>;
/**
* @param {string} key
* @returns {Promise<any>}
*/
  delete(key: string): Promise<any>;
}
/**
*/
export class PluginKeychainMemoryWasmOptions {
  free(): void;
/**
*/
  instanceId: string;
/**
*/
  keychainId: string;
}
