import { create } from "@bufbuild/protobuf";
import {
  AssetSchema as ProtoAssetSchema,
  type Asset as ProtoAsset,
  TokenType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../../cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { FabricFungibleAsset } from "../../cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import {
  Asset,
  FungibleAsset,
  NonFungibleAsset,
  Amount,
  UniqueTokenID,
} from "../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { NetworkId } from "../../public-api";

export function assetToProto(asset: Asset, networkId: NetworkId): ProtoAsset {
  const protoAsset = create(ProtoAssetSchema, {
    tokenId: asset.id,
    tokenType: asset.type,
    referenceId: asset.referenceId,
    owner: asset.owner,
    ercTokenStandard: asset.ercTokenStandard,
  });

  /*  
      Assets interpret the concept of amount in different ways. On Fungible tokens
      the amount is the quantity of one asset that is held or exchanged at a certain
      point in time. On Non Fungible tokens, since each token is unique, what is relevant
      is the unique descriptor of each token, and not a direct token amount, like in
      fungible tokens. This is the reason for the amount parameter definition, while turning
      an asset to a proto and a proto to an asset, differs.
  */
  switch (networkId.ledgerType) {
    case LedgerType.Besu1X:
    case LedgerType.Besu2X:
    case LedgerType.Ethereum:
      switch (asset.type) {
        case TokenType.NONSTANDARD_FUNGIBLE:
          protoAsset.amount = BigInt((asset as EvmFungibleAsset).amount);
          protoAsset.contractAddress = (
            asset as EvmFungibleAsset
          ).contractAddress;
          break;
        case TokenType.NONSTANDARD_NONFUNGIBLE:
          protoAsset.amount = BigInt(
            (asset as EvmNonFungibleAsset).uniqueDescriptor,
          );
          protoAsset.contractAddress = (
            asset as EvmNonFungibleAsset
          ).contractAddress;
          break;
        default:
          throw new Error(`Unsupported asset type ${asset.type}`);
      }
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
  const assetObj: Asset = {
    id: asset.tokenId,
    referenceId: asset.referenceId,
    type: asset.tokenType.valueOf(),
    owner: asset.owner,
    contractName: asset.contractName,
    network: networkId,
    ercTokenStandard: asset.ercTokenStandard,
  };
  if (asset.tokenType == TokenType.NONSTANDARD_FUNGIBLE) {
    (assetObj as FungibleAsset).amount = Number(asset.amount) as Amount;
  } else if (asset.tokenType == TokenType.NONSTANDARD_NONFUNGIBLE) {
    (assetObj as NonFungibleAsset).uniqueDescriptor = Number(
      asset.amount,
    ) as UniqueTokenID;
  }
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
    asset1.contractAddress === asset2.contractAddress &&
    asset1.ercTokenStandard === asset2.ercTokenStandard
  );
}
