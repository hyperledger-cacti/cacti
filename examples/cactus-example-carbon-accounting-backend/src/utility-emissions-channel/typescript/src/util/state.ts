/*
    SPDX-License-Identifier: Apache-2.0
*/

const KEY_SEPARATOR = ":";

/**
 * State class. States have a class, unique key, and a lifecycle current state
 * the current state is determined by the specific subclass
 */
export abstract class State {
  private key: string;
  constructor(keyParts: string[]) {
    this.key = State.makeKey(keyParts);
  }

  getKey(): string {
    return this.key;
  }
  getSplitKey(): string[] {
    return State.splitKey(this.key);
  }
  protected static serialize<T>(object: T): Uint8Array {
    return Buffer.from(JSON.stringify(object));
  }
  protected static deserialize<T>(buf: Uint8Array): T {
    return JSON.parse(buf.toString()) as T;
  }
  static makeKey(keyParts: string[]): string {
    return keyParts.map((part) => JSON.stringify(part)).join(KEY_SEPARATOR);
  }
  static splitKey(key: string): string[] {
    return key.split(KEY_SEPARATOR);
  }
}
