export interface AssetReference {
    id: string
    recipient: string
    numberTokens: string
}

export function createAssetReference(id: string, recipient: string, numberTokens: string): AssetReference {
    return {
        id: id,
        recipient: recipient,
        numberTokens: numberTokens
    }
}