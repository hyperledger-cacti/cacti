import { create } from "@bufbuild/protobuf";
import {
  AssetSchema as ProtoAssetSchema,
  type Asset as ProtoAsset,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import type { Asset } from "../../cross-chain-mechanisms/satp-bridge/types/asset";
import type { EvmAsset } from "../../cross-chain-mechanisms/satp-bridge/types/evm-asset";
import type { FabricAsset } from "../../cross-chain-mechanisms/satp-bridge/types/fabric-asset";
import type { NetworkId } from "../../services/network-identification/chainid-list";
import { LedgerType } from "@hyperledger/cactus-core-api";

export function assetToProto(asset: Asset, networkId: NetworkId): ProtoAsset {
  const protoAsset = create(ProtoAssetSchema, {
    tokenId: asset.tokenId,
    tokenType: asset.tokenType,
    owner: asset.owner,
    amount: BigInt(asset.amount),
  });

  switch (networkId.ledgerType) {
    case LedgerType.Besu1X:
      protoAsset.contractAddress = (asset as EvmAsset).contractAddress;
      break;
    case LedgerType.Besu2X:
      protoAsset.contractAddress = (asset as EvmAsset).contractAddress;
      break;
    case LedgerType.Ethereum:
      protoAsset.contractAddress = (asset as EvmAsset).contractAddress;
      break;
    case LedgerType.Fabric2:
      protoAsset.mspId = (asset as FabricAsset).mspId;
      protoAsset.channelName = (asset as FabricAsset).channelName;
      break;
    default:
      throw new Error(`Unsupported networkId: ${networkId.ledgerType}`);
  }
  return protoAsset;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function protoToAsset(asset: ProtoAsset, networkId: string): Asset {
  const assetObj: Asset = {
    tokenId: asset.tokenId,
    tokenType: asset.tokenType.valueOf(),
    owner: asset.owner,
    amount: Number(asset.amount),
    ontology: asset.ontology,
    contractName: asset.contractName,
  };
  if (asset.mspId) {
    (assetObj as FabricAsset).mspId = asset.mspId;
    (assetObj as FabricAsset).channelName = asset.channelName;
  }
  if (asset.contractAddress) {
    (assetObj as EvmAsset).contractAddress = asset.contractAddress;
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
