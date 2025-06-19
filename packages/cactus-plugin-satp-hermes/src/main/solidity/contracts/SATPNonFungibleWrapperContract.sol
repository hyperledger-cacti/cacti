import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITraceableContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

enum TokenType { ERC721 } 

enum InteractionType { MINT, BURN, ASSIGN, CHECKPERMITION, LOCK, UNLOCK, APPROVE }

struct NFT {
    string contractName;
    address contractAddress;
    TokenType tokenType;
    string tokenId; //Unique NFT identifier
    string referenceId;
    address owner;
    string metadata;
}