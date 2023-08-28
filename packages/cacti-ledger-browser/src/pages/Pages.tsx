import { Routes, Route } from "@solidjs/router";
import TransactionDetails from "./eth/Details/TransactionDetails";
import BlockDetails from "./eth/Details/BlockDetails";
import TokenTransactionDetails from "./eth/Details/TokenTransactionDetails";
import TokenDetails from "./eth/Details/TokenDetails";
import Dashboard from "./eth/Dashboard/Dashboard";
import Transactions from "./eth/Transactions/Transactions";
import Blocks from "./eth/Blocks/Blocks";
import Accounts from "./eth/Accounts/Accounts";
import ERC20 from "./eth/ERC20/ERC20";
import ERC721 from "./eth/ERC721/ERC721";
import SingleTokenHistory from "./eth/SingleTokenHistory/SingleTokenHistory";

import TransactionsFabric from "./fabric/TransactionsFabric/TransactionsFabric";
import BlocksFabric from "./fabric/BlocksFabric/BlocksFabric";
import DashFabric from "./fabric/DashFabric/DashFabric";
import FabricBlock from "./fabric/FabricBlock/FabricBlock";
import FabricTransaction from "./fabric/FabricTransaction/FabricTransaction";

import Home from "./shared/Home/Home";

const Pages = () => {
  return (
    <Routes>
      <Route path="/" component={Home} />
            <Route path="/eth/" component={Dashboard} />
      <Route path="/eth/erc20">
        <Route path="/:account" component={ERC20} />
        <Route path="/trend/:account/:address" component={SingleTokenHistory} />
      </Route>
      <Route path="/eth/erc721">
        <Route path="/:account" component={ERC721} />
      </Route>
      <Route path="/eth/blocks" component={Blocks} />
      <Route path="/eth/transactions" component={Transactions} />
      <Route path="/eth/accounts">
        <Route path="/:standard" component={Accounts} />
      </Route>
      <Route path="/eth/block-details">
        <Route path="/:number" component={BlockDetails} />
      </Route>
      <Route path="/eth/token-txn-details">
        <Route path="/:standard/:address" component={TokenTransactionDetails} />
      </Route>
      <Route path="/eth/token-details">
        <Route path="/:standard/:address" component={TokenDetails} />
      </Route>
      <Route path="/eth/txn-details">
        <Route path="/:id" component={TransactionDetails} />
      </Route>
      
      <Route path="/fabric/" component={DashFabric} />
      
      <Route path="/fabric/transactions" component={TransactionsFabric} />
      <Route path="/fabric/blocks" component={BlocksFabric} />
      <Route path="/fabric/txn-details">
        <Route path="/:id" component={FabricTransaction} />
      </Route>
      <Route path="/fabric/block-details">
        <Route path="/:id" component={FabricBlock} />
      </Route>
    </Routes>
  );
};
export default Pages;
