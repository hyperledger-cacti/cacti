import re

besu_path = r"c:\Users\LOQ\New folder\cacti\packages\cactus-plugin-satp-hermes\src\main\typescript\cross-chain-mechanisms\bridge\leafs\besu-leaf.ts"
fabric_path = r"c:\Users\LOQ\New folder\cacti\packages\cactus-plugin-satp-hermes\src\main\typescript\cross-chain-mechanisms\bridge\leafs\fabric-leaf.ts"

# Fix besu-leaf.ts params array
with open(besu_path, "r") as f:
    besu_content = f.read()

besu_content = re.sub(
    r'(methodName: "lock",\s*params:\s*)\[assetId, assetAttribute\]',
    r'\1uniqueDescriptor !== undefined ? [assetId, assetAttribute, uniqueDescriptor] : [assetId, assetAttribute]',
    besu_content
)
besu_content = re.sub(
    r'(methodName: "unlock",\s*params:\s*)\[assetId, assetAttribute\]',
    r'\1uniqueDescriptor !== undefined ? [assetId, assetAttribute, uniqueDescriptor] : [assetId, assetAttribute]',
    besu_content
)
besu_content = re.sub(
    r'(methodName: "mint",\s*params:\s*)\[assetId, assetAttribute\]',
    r'\1uniqueDescriptor !== undefined ? [assetId, assetAttribute, uniqueDescriptor] : [assetId, assetAttribute]',
    besu_content
)
besu_content = re.sub(
    r'(methodName: "burn",\s*params:\s*)\[assetId, assetAttribute\]',
    r'\1uniqueDescriptor !== undefined ? [assetId, assetAttribute, uniqueDescriptor] : [assetId, assetAttribute]',
    besu_content
)
besu_content = re.sub(
    r'(methodName: "assign",\s*params:\s*)\[assetId, to, assetAttribute\]',
    r'\1uniqueDescriptor !== undefined ? [assetId, to, assetAttribute, uniqueDescriptor] : [assetId, to, assetAttribute]',
    besu_content
)

with open(besu_path, "w") as f:
    f.write(besu_content)

print("Besu updated")

# Fix fabric-leaf.ts signatures
with open(fabric_path, "r") as f:
    fabric_content = f.read()

fabric_content = re.sub(
    r'(public async lockAsset\(\s*assetId: string,\s*assetAttribute: Amount \| UniqueTokenID,?\s*)\): Promise<TransactionResponse>',
    r'\1, uniqueDescriptor?: UniqueTokenID): Promise<TransactionResponse>',
    fabric_content
)
fabric_content = re.sub(
    r'(public async unlockAsset\(\s*assetId: string,\s*assetAttribute: Amount \| UniqueTokenID,?\s*)\): Promise<TransactionResponse>',
    r'\1, uniqueDescriptor?: UniqueTokenID): Promise<TransactionResponse>',
    fabric_content
)
fabric_content = re.sub(
    r'(public async mintAsset\(\s*assetId: string,\s*assetAttribute: Amount \| UniqueTokenID,?\s*)\): Promise<TransactionResponse>',
    r'\1, uniqueDescriptor?: UniqueTokenID): Promise<TransactionResponse>',
    fabric_content
)
fabric_content = re.sub(
    r'(public async burnAsset\(\s*assetId: string,\s*assetAttribute: Amount \| UniqueTokenID,?\s*)\): Promise<TransactionResponse>',
    r'\1, uniqueDescriptor?: UniqueTokenID): Promise<TransactionResponse>',
    fabric_content
)
fabric_content = re.sub(
    r'(public async assignAsset\(\s*assetId: string,\s*to: string,\s*assetAttribute: Amount \| UniqueTokenID,?\s*)\): Promise<TransactionResponse>',
    r'\1, uniqueDescriptor?: UniqueTokenID): Promise<TransactionResponse>',
    fabric_content
)

with open(fabric_path, "w") as f:
    f.write(fabric_content)

print("Fabric updated")
