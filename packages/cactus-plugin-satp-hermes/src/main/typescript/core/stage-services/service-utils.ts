import { create } from "@bufbuild/protobuf";
import {
  AssetSchema as ProtoAssetSchema,
  type Asset as ProtoAsset,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { EvmFungibleAsset } from "../../cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { FabricFungibleAsset } from "../../cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import {
  Asset,
  FungibleAsset,
} from "../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { NetworkId } from "../../public-api";

export function assetToProto(
  asset: FungibleAsset,
  networkId: NetworkId,
): ProtoAsset {
  const protoAsset = create(ProtoAssetSchema, {
    tokenId: asset.id,
    tokenType: asset.type,
    referenceId: asset.referenceId,
    owner: asset.owner,
    amount: BigInt(asset.amount),
  });

  switch (networkId.ledgerType) {
    case LedgerType.Besu1X:
      protoAsset.contractAddress = (asset as EvmFungibleAsset).contractAddress;
      break;
    case LedgerType.Besu2X:
      protoAsset.contractAddress = (asset as EvmFungibleAsset).contractAddress;
      break;
    case LedgerType.Ethereum:
      protoAsset.contractAddress = (asset as EvmFungibleAsset).contractAddress;
      break;
    case LedgerType.Fabric2:
      protoAsset.mspId = (asset as FabricFungibleAsset).mspId;
      protoAsset.channelName = (asset as FabricFungibleAsset).channelName;
      break;
    default:
      throw new Error(`Unsupported networkId: ${networkId.ledgerType}`);
  }
  return protoAsset;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function protoToAsset(asset: ProtoAsset, networkId: NetworkId): Asset {
  const assetObj: FungibleAsset = {
    id: asset.tokenId,
    referenceId: asset.referenceId,
    type: asset.tokenType.valueOf(),
    owner: asset.owner,
    amount: String(asset.amount),
    contractName: asset.contractName,
    network: networkId,
  };
  if (asset.mspId) {
    (assetObj as FabricFungibleAsset).mspId = asset.mspId;
    (assetObj as FabricFungibleAsset).channelName = asset.channelName;
  }
  if (asset.contractAddress) {
    (assetObj as EvmFungibleAsset).contractAddress = asset.contractAddress;
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
    asset1.contractName === asset2.contractName &&
    asset1.mspId === asset2.mspId &&
    asset1.channelName === asset2.channelName &&
    asset1.contractAddress === asset2.contractAddress
  );
}
