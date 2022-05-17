const axios = require("axios");

async function main() {
  // Read ethereum balances
  const fromAccountResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/balance/0x06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97",
  );
  console.log("\n# Ethereum fromAccount:");
  console.log(fromAccountResponse.data);

  const toAccountResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/balance/0x9d624f7995e8bd70251f8265f2f9f2b49f169c55",
  );
  console.log("\n# Ethereum toAccount:");
  console.log(toAccountResponse.data);

  // Read fabric assets
  const fabricResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/fabric-asset/",
  );
  console.log("\n# Fabric:");
  console.log(fabricResponse.data.data);
}

main();
