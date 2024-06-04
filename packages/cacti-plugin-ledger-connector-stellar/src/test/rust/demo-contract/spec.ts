/* eslint-disable */

// spell-checker:disable
export const spec = [
  "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAAAAAAAAAAABU5hbWVzAAAAAAAAAQAAAAAAAAAHQmFsYW5jZQAAAAABAAAAEw==",
  "AAAAAAAAAAAAAAAJc2F5X2hlbGxvAAAAAAAAAAAAAAEAAAAR",
  "AAAAAAAAAAAAAAAMc2F5X2hlbGxvX3RvAAAAAQAAAAAAAAACdG8AAAAAABEAAAABAAAD6gAAABE=",
  "AAAAAAAAAAAAAAAIZ2V0X25hbWUAAAAAAAAAAQAAABE=",
  "AAAAAAAAAAAAAAAIc2V0X25hbWUAAAABAAAAAAAAAARuYW1lAAAAEQAAAAA=",
  "AAAAAAAAAAAAAAARZ2V0X25hbWVfYnlfaW5kZXgAAAAAAAABAAAAAAAAAAVpbmRleAAAAAAAAAQAAAABAAAAEQ==",
  "AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAIYXNzZXRfaWQAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
];
// spell-checker:enable

export enum methods {
  sayHello = "say_hello",
  sayHelloTo = "say_hello_to",
  getName = "get_name",
  setName = "set_name",
  getNameByIndex = "get_name_by_index",
  deposit = "deposit",
}

export type SayHelloArgs = {};
export type SayHelloToArgs = { to: string };
export type GetNameArgs = {};
export type SetNameArgs = { name: string };
export type GetNameByIndexArgs = { index: number };
export type DepositArgs = { from: string; asset_id: string; amount: number };

export type SayHelloResponse = string;
export type SayHelloToResponse = string[];
export type GetNameResponse = string;
export type SetNameResponse = null;
export type GetNameByIndexResponse = string;
export type DepositResponse = null;
