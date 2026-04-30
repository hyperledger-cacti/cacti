import re

layer_path = r"c:\Users\LOQ\New folder\cacti\packages\cactus-plugin-satp-hermes\src\main\typescript\cross-chain-mechanisms\bridge\satp-bridge-execution-layer-implementation.ts"

with open(layer_path, "r") as f:
    content = f.read()

# LOCK
lock_old = """      case SATPStageOperations.LOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).lockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );"""
lock_new = """      case SATPStageOperations.LOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).lockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
            (asset as FungibleAsset).uniqueDescriptor
          );"""
content = content.replace(lock_old, lock_new)

# UNLOCK
unlock_old = """      case SATPStageOperations.UNLOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).unlockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );"""
unlock_new = """      case SATPStageOperations.UNLOCK:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).unlockAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
             (asset as FungibleAsset).uniqueDescriptor
          );"""
content = content.replace(unlock_old, unlock_new)

# MINT
mint_old = """      case SATPStageOperations.MINT:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).mintAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );"""
mint_new = """      case SATPStageOperations.MINT:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).mintAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
            (asset as FungibleAsset).uniqueDescriptor
          );"""
content = content.replace(mint_old, mint_new)

# BURN
burn_old = """      case SATPStageOperations.BURN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).burnAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
          );"""
burn_new = """      case SATPStageOperations.BURN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).burnAsset(
            asset.id,
            Number((asset as FungibleAsset).amount) as Amount,
            (asset as FungibleAsset).uniqueDescriptor
          );"""
content = content.replace(burn_old, burn_new)

# ASSIGN
assign_old = """      case SATPStageOperations.ASSIGN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).assignAsset(
            asset.id,
            asset.owner,
            Number((asset as FungibleAsset).amount) as Amount,
          );"""
assign_new = """      case SATPStageOperations.ASSIGN:
        if (instanceOfFungibleAsset(asset)) {
          response = await (bridgeEndPoint as BridgeLeafFungible).assignAsset(
            asset.id,
            asset.owner,
            Number((asset as FungibleAsset).amount) as Amount,
            (asset as FungibleAsset).uniqueDescriptor
          );"""
content = content.replace(assign_old, assign_new)

with open(layer_path, "w") as f:
    f.write(content)

print("Layer updated")
