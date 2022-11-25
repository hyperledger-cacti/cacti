const axios = require("axios");

async function main() {
  // Read ethereum balances
  const fromAccountResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/balance/0xec709e1774f0ce4aba47b52a499f9abaaa159f71",
  );
  console.log("\n# Ethereum fromAccount:");
  console.log(fromAccountResponse.data);

  const escrowAccountResponse = await axios.get(
    "http://localhost:5034/api/v1/bl/balance/0x36e146d5afab61ab125ee671708eeb380aea05b6",
  );
  console.log("\n# Ethereum escrowAccount:");
  console.log(escrowAccountResponse.data);

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
