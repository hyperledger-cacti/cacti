import { Asset as ProtoAsset } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { SupportedChain } from "../types";
import { Asset } from "./satp-bridge/types/asset";
import { EvmAsset } from "./satp-bridge/types/evm-asset";
import { FabricAsset } from "./satp-bridge/types/fabric-asset";

export function assetToProto(
  asset: Asset,
  networkId: SupportedChain,
): ProtoAsset {
  const protoAsset = new ProtoAsset();
  protoAsset.tokenId = asset.tokenId;
  protoAsset.tokenType = asset.tokenType;
  protoAsset.owner = asset.owner;
  protoAsset.amount = BigInt(asset.amount);

  switch (networkId) {
    case SupportedChain.BESU:
      protoAsset.contractAddress = (asset as EvmAsset).contractAddress;
      break;
    case SupportedChain.EVM:
      protoAsset.contractAddress = (asset as EvmAsset).contractAddress;
      break;
    case SupportedChain.FABRIC:
      protoAsset.mspId = (asset as FabricAsset).mspId;
      protoAsset.channelName = (asset as FabricAsset).channelName;
      break;
    default:
      throw new Error(`Unsupported networkId: ${networkId}`);
  }
  return protoAsset;
}

export function protoToAsset(asset: ProtoAsset, networkId: string): Asset {
  const assetObj: Asset = {
    tokenId: asset.tokenId,
    tokenType: asset.tokenType.valueOf(),
    owner: asset.owner,
    amount: Number(asset.amount),
    ontology: asset.ontology,
    contractName: asset.contractName,
  };

  switch (networkId) {
    case SupportedChain.EVM:
      (assetObj as EvmAsset).contractAddress = asset.contractAddress;
      break;
    case SupportedChain.BESU:
      (assetObj as EvmAsset).contractAddress = asset.contractAddress;
      break;
    case SupportedChain.FABRIC:
      (assetObj as FabricAsset).mspId = asset.mspId;
      (assetObj as FabricAsset).channelName = asset.channelName;
      break;
    default:
      throw new Error(`Unsupported networkId: ${networkId}`);
  }
  return assetObj;
}

export function compareProtoAsset(
  asset1: ProtoAsset,
  asset2: ProtoAsset,
): boolean {
  return (
    asset1.tokenId === asset2.tokenId &&
    asset1.tokenType === asset2.tokenType &&
    asset1.owner === asset2.owner &&
    asset1.amount === asset2.amount &&
    asset1.ontology === asset2.ontology &&
    asset1.contractName === asset2.contractName &&
    asset1.mspId === asset2.mspId &&
    asset1.channelName === asset2.channelName &&
    asset1.contractAddress === asset2.contractAddress
  );
}
