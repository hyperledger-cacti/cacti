const { ethers } = require("ethers");

// Use your own provider URL
const provider = new ethers.JsonRpcProvider(
  "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
);
const paymentContractAddress = "0xD4414Cd021aD95a1E91Bc09E620dA1f152B7521A";

// ABI for the functions we need
const paymentAbi = [
  "function getPayment(uint256 _paymentId) public view returns (uint256 id, address payer, address payee, uint256 amount, string memory productId, string memory productType, uint8 status, uint256 timestamp, string memory transactionReference)",
  "function owner() public view returns (address)",
  "function roleManagerAddress() public view returns (address)",
];

async function checkPayment() {
  const paymentContract = new ethers.Contract(
    paymentContractAddress,
    paymentAbi,
    provider,
  );

  try {
    // First check if the payment exists
    const paymentId = 10;
    const payment = await paymentContract.getPayment(paymentId);
    console.log("Payment details:", {
      id: payment.id.toString(),
      payer: payment.payer,
      payee: payment.payee,
      amount: ethers.formatEther(payment.amount),
      status: payment.status,
      productId: payment.productId,
    });

    // Check the contract owner
    const owner = await paymentContract.owner();
    console.log("Contract owner:", owner);

    // Check role manager
    const roleManagerAddress = await paymentContract.roleManagerAddress();
    console.log("Role Manager Address:", roleManagerAddress);
  } catch (error) {
    console.error("Error fetching payment:", error.message);
  }
}

checkPayment();
