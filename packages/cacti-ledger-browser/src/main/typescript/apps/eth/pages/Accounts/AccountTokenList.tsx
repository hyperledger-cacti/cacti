import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";

import PageTitle from "../../../../components/ui/PageTitle";
import AccountERC721View from "../../components/AccountERC721View/AccountERC721View";
import AccountERC20View from "../../components/AccountERC20View/AccountERC20View";

const ERC20_TAB_INDEX = "erc20";
const ERC721_TAB_INDEX = "erc721";

export type AccountTokenListProps = {
  accountAddress: string;
};

export default function AccountTokenList({
  accountAddress,
}: AccountTokenListProps) {
  const [tabIndex, setTabIndex] = React.useState(ERC20_TAB_INDEX);

  return (
    <Box>
      <PageTitle>Tokens</PageTitle>
      <Box sx={{ width: "100%" }}>
        <TabContext value={tabIndex}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={(_event, newValue) => {
                setTabIndex(newValue);
              }}
              aria-label="tab select token to display"
              textColor="secondary"
              indicatorColor="primary"
            >
              <Tab label="ERC20" value={ERC20_TAB_INDEX} />
              <Tab label="ERC721 (NFT)" value={ERC721_TAB_INDEX} />
            </TabList>
          </Box>
          <TabPanel value={ERC20_TAB_INDEX}>
            <AccountERC20View
              key={accountAddress}
              accountAddress={accountAddress}
            />
          </TabPanel>
          <TabPanel value={ERC721_TAB_INDEX}>
            <AccountERC721View
              key={accountAddress}
              accountAddress={accountAddress}
            />
          </TabPanel>
        </TabContext>
      </Box>
    </Box>
  );
}
