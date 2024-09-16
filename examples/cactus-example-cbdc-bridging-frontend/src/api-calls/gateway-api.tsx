/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getEthAddress, getEthUserPrKey } from "./common";
import { getUserFromPseudonim, getFabricId } from "./common";
import {
  createSessionReference,
  SessionReference,
} from "../models/SessionReference";

import BesuSATPInteraction from "../ontology/besu-erc20-ontology.json";
import FabricSATPInteraction from "../ontology/fabric-erc20-ontology.json";
import { uuidV4 } from "web3-utils";

const FABRIC_CHANNEL_NAME = "mychannel";
const CONTRACT_CBDC_ERC20_NAME = "SATPContract";
const CONTRACT_WRAPPER_NAME = "SATPWrapperContract";

export async function getSessionReferencesBridge(port: string): Promise<any> {
  try {
    const response = await axios.get(
      `http://localhost:${port}/api/v1/@hyperledger/cactus-plugin-satp-hermes/get-sessions-ids`,
      {},
    );
    if (response.status !== 200) {
      return [
        {
          id: "MockID",
          status: "undefined",
          substatus: "undefined",
          originLedger: "undefined",
          destinyLedger: "undefined",
        },
      ];
    }
    const ids = response.data;

    const sessionsData = [];
    for (const id of ids) {
      try {
        const sessionData = await axios.get(
          `http://localhost:${port}/api/v1/@hyperledger/cactus-plugin-satp-hermes/status`,
          {
            params: { SessionID: id },
          },
        );
        const data: SessionReference = createSessionReference(
          id,
          sessionData.data.status,
          sessionData.data.substatus,
          sessionData.data.originChain.dltProtocol,
          sessionData.data.destinationChain.dltProtocol,
        );
        sessionsData.push(data);
      } catch (error) {
        sessionsData.push({
          id: "MockID",
          status: "undefined",
          substatus: "undefined",
          originLedger: "undefined",
          destinyLedger: "undefined",
        });
      }
    }
    return sessionsData;
  } catch (error) {
    console.log(error);
    return [
      {
        id: "MockID",
        status: "undefined",
        substatus: "undefined",
        originLedger: "undefined",
        destinyLedger: "undefined",
      },
    ];
  }
}

export async function bridgeTokens(
  sender: string,
  recipient: string,
  sourceChain: string,
  destinationChain: string,
  amount: number,
) {
  let senderAddress;
  let receiverAddress;
  let port;
  let sourceAsset;
  let destinationAsset;
  //only way we found to pass contract address from backend to frontend at each run of tests
  const response = await fetch("http://localhost:9999/contract-address");
  const data = await response.json();
  const besuContractAddress = data.address;

  let fromDLTNetworkID;
  let toDLTNetworkID;

  if (sourceChain === "Fabric") {
    senderAddress = getFabricId(sender);
    sourceAsset = setFabricAsset(senderAddress as string);
    fromDLTNetworkID = "FabricSATPGateway";
    port = "4010";
  } else {
    fromDLTNetworkID = "BesuSATPGateway";
    senderAddress = getEthAddress(sender);
    sourceAsset = setBesuAsset(senderAddress as string, besuContractAddress);
    port = "4110";
  }

  if (destinationChain === "Fabric") {
    toDLTNetworkID = "FabricSATPGateway";
    receiverAddress = getFabricId(recipient);
    destinationAsset = setFabricAsset(receiverAddress as string);
  } else {
    toDLTNetworkID = "BesuSATPGateway";
    receiverAddress = getEthAddress(recipient);
    destinationAsset = setBesuAsset(
      receiverAddress as string,
      besuContractAddress,
    );
  }
  try {
    await axios.post(
      `http://localhost:${port}/api/v1/@hyperledger/cactus-plugin-satp-hermes/transact`,
      {
        contextID: "MockID",
        fromDLTNetworkID,
        toDLTNetworkID,
        fromAmount: amount,
        toAmount: amount,
        receiver: receiverAddress,
        originatorPubkey: senderAddress,
        beneficiaryPubkey: receiverAddress,
        sourceAsset,
        destinyAsset: destinationAsset,
      },
    );
  } catch (error) {
    throw error;
    //return true;
  }

  function setBesuAsset(owner: string, contractAddress: string) {
    return {
      owner,
      ontology: JSON.stringify(BesuSATPInteraction),
      contractName: CONTRACT_CBDC_ERC20_NAME,
      contractAddress,
    };
  }

  function setFabricAsset(owner: string) {
    return {
      owner,
      ontology: JSON.stringify(FabricSATPInteraction),
      contractName: CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      mspId: "Org1MSP",
    };
  }
}
