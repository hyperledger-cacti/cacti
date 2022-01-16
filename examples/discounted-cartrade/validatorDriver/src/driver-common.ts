/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * driver-common.ts
 */

import {
  IVerifier,
  ApiInfo,
  RequestedData,
  LedgerEvent,
} from "./ledger-plugin";

// for debug
export function json2str(jsonObj: object) {
  try {
    return JSON.stringify(jsonObj);
  } catch (error) {
    console.log("invalid json format.");
    return null;
  }
}

export function makeApiInfoList(targetApiInfo: any): Array<ApiInfo> {
  const retApiInfoList: Array<ApiInfo> = [];
  for (const item of targetApiInfo) {
    const apiInfo: ApiInfo = new ApiInfo();
    apiInfo.apiType = item.apiType;
    for (const reqDataItem of item.requestedData) {
      const reqData = new RequestedData();
      reqData.dataName = reqDataItem.dataName;
      reqData.dataType = reqDataItem.dataType;
      apiInfo.requestedData.push(reqData);
    }
    retApiInfoList.push(apiInfo);
  }
  return retApiInfoList;
}

// store on socket
const socketArray = [];

// Returns the index of socketArray as a return value
export function addSocket(socket: any): number {
  // TODO:
  const index = socketArray.push(socket) - 1;
  console.log(`##addSocket, index = ${index}`);
  return index;
}

export function getStoredSocket(index: number): any {
  console.log(`##getSocket, index = ${index}`);
  return socketArray[index];
}

export function deleteAndDisconnectSocke(index: number) {
  try {
    console.log(`##deleteAndDisconnectSocke, index = ${index}`);
    if (socketArray.length > index) {
      const socket = socketArray[index];
      if (socket.connected) {
        console.log(`##call disconnect, index = ${index}`);
        socket.disconnect();
      } else {
        console.log(`##already disconnected, index = ${index}`);
      }
    }
  } catch (err) {
    console.log(`##error:deleteAndDisconnectSocke, index = ${index}, ${err}`);
  }
}
