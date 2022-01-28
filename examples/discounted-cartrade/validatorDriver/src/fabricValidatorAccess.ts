/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabricValidatorAccess.ts
 */

import {
  IVerifier,
  ApiInfo,
  RequestedData,
  LedgerEvent,
} from "./ledger-plugin";
import {
  json2str,
  makeApiInfoList,
  addSocket,
  getStoredSocket,
  deleteAndDisconnectSocke,
} from "./driver-common";

import { io } from "socket.io-client";

const targetValidatorUrl = "https://localhost:5040";

// Definition of ApiInfo
const apiInfoListForFabric = [
  {
    apiType: "changeCarOwner",
    requestedData: [
      {
        dataName: "carId",
        dataType: "string",
      },
      {
        dataName: "newOwner",
        dataType: "string",
      },
    ],
  },
  {
    apiType: "sendSignedTransaction",
    requestedData: [
      {
        dataName: "signedCommitProposal",
        dataType: "string",
      },
      {
        dataName: "commitReq",
        dataType: "string",
      },
    ],
  },
];

class FabricVerifier implements IVerifier {
  /*
   * isExistFunction
   *
   * @param {String} funcName Function name to be judged
   *
   * @return {Boolean} true: exit /false: not exit
   *
   * @desc Determines if the specified function exists in that class.
   *       Make sure that the support status of the class can be determined by the class.
   *       Functions that you do not want to call directly need to be devised by implementing them outside of this class like utilities.
   */
  isExistFunction(funcName) {
    console.log("call : isExistFunction");
    if (this[funcName] != undefined) {
      return true;
    } else {
      return false;
    }
  }

  execFunction(func, param): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log("call : execFunction");
      if (func === "getApiList") {
        // getApiList
        try {
          const result = this.getApiList();
          return resolve(result);
        } catch (err) {
          return reject(err);
        }
      } else if (func === "requestLedgerOperation") {
        // requestLedgerOperation
        try {
          this.requestLedgerOperation(param);
          return resolve("send API");
        } catch (err) {
          return reject(err);
        }
      } else if (func === "startMonitor") {
        // startMonitor
        try {
          this.startMonitor()
            .then((event) => {
              console.log("event : " + event);
              return resolve(event);
            })
            .catch((err) => {
              return reject(err);
            });
        } catch (err) {
          return reject(err);
        }
      } else if (func === "stopMonitor") {
        // stopMonitor
        try {
          this.stopMonitor(param);
          return resolve();
        } catch (err) {
          return reject(err);
        }
      }
    });
  }

  getApiList(): Array<ApiInfo> {
    console.log("call : getApiList");
    // TODO:
    // NOTE: Return API information that can be used with Fabric version of requestLedgerOperation.
    //       Fabric version returns 2 kinds of API information.
    //          - changeCarOwner
    //          - sendSignedTransaction
    return makeApiInfoList(apiInfoListForFabric);
  }

  checkNull(value: any, name: string) {
    if (value != null) {
      return;
    } else {
      const err: { status?: number; message: string } = new Error(
        name + " is Null"
      );
      err.status = 400;
      throw err;
    }
  }

  requestLedgerOperation(param): void {
    console.log("call : requestLedgerOperation");
    try {
      if (!param) {
        var err: { status?: number; message: string } = new Error(
          "param is Null"
        );
        err.status = 400;
        throw err;
      }

      if (typeof param == "string") {
        console.log("##requestLedgerOperation : JSON.parse(param)");
        param = JSON.parse(param);
      }
      console.log("##requestLedgerOperation(A)");
      console.log("param : " + JSON.stringify(param));

      const apiType = param.apiType;
      const progress = param.progress;
      const data = param.data;

      //let targetValidatorUrl = "https://localhost:5040";
      const socketOptions = {
        rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
        reconnection: false,
        timeout: 20000,
      };
      const socket = io(targetValidatorUrl, socketOptions);

      if (apiType === "changeCarOwner") {
        // changeCarOwner
        this.checkNull(data.carId, "carId");
        this.checkNull(data.newOwner, "newOwner");

        const requestData = {
          func: apiType,
          args: data,
        };
        console.log("requestData : " + JSON.stringify(requestData));
        socket.emit("request", requestData);
        return;
      } else if (apiType === "sendSignedTransaction") {
        // sendSignedTransaction
        this.checkNull(data.signedCommitProposal, "signedCommitProposal");
        this.checkNull(data.commitReq, "commitReq");

        // NOTE: If you do not convert the following, you will get an error.
        data.signedCommitProposal.signature = Buffer.from(
          data.signedCommitProposal.signature
        );
        data.signedCommitProposal.proposal_bytes = Buffer.from(
          data.signedCommitProposal.proposal_bytes
        );

        const signRequestData = {
          func: apiType,
          args: data,
        };
        console.log("requestData : " + JSON.stringify(signRequestData));
        socket.emit("request", signRequestData);
        return;
      } else {
        var err: { status?: number; message: string } = new Error(
          "apiType is Not Exist : " + apiType
        );
        err.status = 400;
        throw err;
      }
    } catch (err) {
      throw err;
    }
  }

  startMonitor(): Promise<LedgerEvent> {
    return new Promise((resolve, reject) => {
      console.log("call : startMonitor");
      // TODO:
      // NOTE: Start the event monitor for the Fabric version of Validator and enable event reception.
      try {
        //let targetValidatorUrl = "https://localhost:5040";
        const soecktOptions = {
          rejectUnauthorized: false, // temporary avoidance since self-signed certificates are used
          reconnection: false,
          timeout: 20000,
        };

        console.log(
          `##in startMonitor, targetValidatorUrl = ${targetValidatorUrl}`
        );
        const socket = io(targetValidatorUrl, soecktOptions);
        console.log("##startMonitor(A)");

        socket.on("connect_error", (err: Object) => {
          console.log("##connect_error:", err);
          // end communication
          socket.disconnect();
          reject(err);
        });

        socket.on("connect_timeout", (err: Object) => {
          console.log("####Error:", err);
          // end communication
          socket.disconnect();
          reject(err);
        });

        socket.on("error", (err: Object) => {
          console.log("####Error:", err);
          socket.disconnect();
          reject(err);
        });

        socket.on("eventReceived", function (res: any) {
          // output the data received from the client
          console.log("#[recv]eventReceived, res: " + json2str(res));
        });

        socket.on("connect", () => {
          console.log("#connect");
          // save socket
          const sIndex = addSocket(socket);
          console.log("##emit: startMonitor");
          socket.emit("startMonitor");
          const ledgerEvent = new LedgerEvent();
          ledgerEvent.id = String(sIndex);
          console.log(`##startMonitor, ledgerEvent.id = ${ledgerEvent.id}`);
          resolve(ledgerEvent);
        });
      } catch (err) {
        console.log(`##Error: startMonitor, ${err}`);
        reject(err);
      }
    });
  }

  stopMonitor(param): void {
    console.log(`##call : stopMonitor, param = ${param}`);
    // NOTE: Stop the Fabric Validator event monitor.
    try {
      const socketIndex = parseInt(param);
      if (socketIndex < 0) {
        console.log(`##stopMonitor: invalid socketIndex = ${socketIndex}`);
        return;
      }
      const socket = getStoredSocket(socketIndex);
      socket.emit("stopMonitor");
      //deleteAndDisconnectSocke(socketIndex);
      setTimeout(() => {
        console.log(
          `##call deleteAndDisconnectSocke, socketIndex = ${socketIndex}`
        );
        deleteAndDisconnectSocke(socketIndex);
      }, 3000);
    } catch (err) {
      console.log(`##Error: stopMonitor, ${err}`);
      return;
    }
  }
}

const fabricVerifier = new FabricVerifier();

module.exports = fabricVerifier;
