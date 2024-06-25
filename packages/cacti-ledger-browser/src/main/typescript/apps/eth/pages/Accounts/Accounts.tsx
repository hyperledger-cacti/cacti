import * as React from "react";
import { ethers } from "ethers";
import SearchIcon from "@mui/icons-material/Search";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import AccountTokenList from "./AccountTokenList";
import AccountTransactionList from "./AccountTransactionList";

export default function Accounts() {
  const [accountSearchText, setAccountSearchText] = React.useState("");
  const [errorText, setErrorText] = React.useState("");
  const [account, setAccount] = React.useState("");

  const handleSearchClick = () => {
    if (!ethers.isAddress(accountSearchText.toLowerCase())) {
      return setErrorText(
        "Address format not recognized, use valid hexadecimal address",
      );
    }

    setAccount(accountSearchText);
  };

  return (
    <Box>
      {/* Search Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ padding: 2 }}>
          <TextField
            label="Account address"
            sx={{ width: 600 }}
            variant={account ? "filled" : "standard"}
            value={accountSearchText}
            onChange={(e) => {
              setErrorText("");
              setAccountSearchText(e.target.value.trim());
            }}
            error={Boolean(errorText)}
            helperText={errorText}
          />
        </Box>
        <Button
          variant="contained"
          size="large"
          endIcon={<SearchIcon />}
          onClick={handleSearchClick}
        >
          Search
        </Button>
      </Box>

      {/* Account transactions */}
      <Box paddingBottom={4}>
        {account && <AccountTransactionList accountAddress={account} />}
      </Box>

      {/* Account token list */}
      {account && <AccountTokenList accountAddress={account} />}
    </Box>
  );
}
