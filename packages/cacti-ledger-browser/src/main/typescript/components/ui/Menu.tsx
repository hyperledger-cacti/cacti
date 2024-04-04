import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LedgerSelector from "../AppShell/LedgerSelector";
import styles from "./Menu.module.css";
import Button from "./Button";

const ledgersPaths: Record<any, { title: string; path: string; basePath?: string; }[]> = {
  eth: [
    { title: "DASHBOARD", path: "/eth/dashboard" },
    { title: "ERC20", path: "/eth/accounts/erc20" },
    { title: "NFT ERC721", path: "/eth/accounts/erc721" },
  ],
  fabric: [{ title: "DASHBOARD", path: "/fabric/dashboard", basePath: "/eth" }],
};

function Menu() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeLedger, setActiveLedger] = useState("");
  const handleSelect = (selectedValue: string) => {
    setActiveLedger(selectedValue);

    navigate(`/${selectedValue}/dashboard`);
  };

  const updateLedgers = () => {
    if (activeLedger.length > 0) return;
    const currentPath = location.pathname;
    const ledgers = ["eth", "fabric"];

    ledgers.forEach((ledger) => {
      if (currentPath.includes(ledger)) {
        setActiveLedger(ledger);
      }
    });
  };

  useEffect(() => {
    updateLedgers();
  });

  function activeLedgerItems(ledger: any) {
    const items = ledger.map(function (path: any) {
      return (
        <Button onClick={() => navigate(path.path)} type="menu">
          {path.title}
        </Button>
      );
    });
    return items;
  }

  return (
    <div className={styles["nav-bar"]}>
      <LedgerSelector
        value={activeLedger}
        onSelect={(val: string) => {
          handleSelect(val);
        }}
      />

      {activeLedger.length > 0 ? (
        <nav className={styles.navigation}>
          {activeLedgerItems(ledgersPaths[activeLedger] )}
        </nav>
      ) : null}
    </div>
  );
}

export default Menu;
