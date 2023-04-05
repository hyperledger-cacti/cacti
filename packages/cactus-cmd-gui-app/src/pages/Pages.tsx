import { Routes, Route } from "@solidjs/router";
import TransactionDetails from "./Details/TransactionDetails";
import blockDetails from "./Details/BlockDetails";
import TokenTransactionDetails from "./Details/TokenTransactionDetails";
import TokenDetails from "./Details/TokenDetails";
import Dashboard from "./Dashboard/Dashboard";
import Transactions from "./Transactions/Transactions";
import Blocks from "./Blocks/Blocks";
import Accounts from "./Accounts/Accounts";
import ERC20 from "./ERC20/ERC20";
import ERC721 from "./ERC721/ERC721";
import SingleTokenHistory from "./SingleTokenHistory/SingleTokenHistory";

const Pages = () => {
  return (
    <Routes>
      <Route path="/" component={Dashboard} />
      <Route path="/ERC20">
        <Route path="/:account" component={ERC20} />
        <Route path="/trend/:account/:address" component={SingleTokenHistory} />
      </Route>
      <Route path="/ERC721">
        <Route path="/:account" component={ERC721} />
      </Route>
      <Route path="/blocks" component={Blocks} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/accounts">
        <Route path="/:standard" component={Accounts} />
      </Route>
      <Route path="/BlockDetails">
        <Route path="/:number" component={blockDetails} />
      </Route>
      <Route path="/token-txn-details">
        <Route path="/:standard/:address" component={TokenTransactionDetails} />
      </Route>
      <Route path="/token-details">
        <Route path="/:standard/:address" component={TokenDetails} />
      </Route>
      <Route path="/view">
        <Route path="/:id" component={TransactionDetails} />
      </Route>
    </Routes>
  );
};
export default Pages;
