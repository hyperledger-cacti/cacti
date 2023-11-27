import Button from "../Button/Button";
import { createSignal, createEffect, For, Show } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
// @ts-expect-error
import styles from "./Menu.module.css";
import Select from "../Select/Select";

const pathsEth = [
  { title: "DASHBOARD", path: "/eth" },
  { title: "ERC20", path: "/eth/accounts/erc20" },
  { title: "NFT ERC721", path: "/eth/accounts/erc721" },
];
const pathsFabric = [{ title: "DASHBOARD", path: "/fabric" }];

const Menu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLedger, setActiveLedger] = createSignal("");
  
  const handleSelect = (selectedValue: string) => {
    setActiveLedger(selectedValue);
    navigate(`/${activeLedger()}`)
  };

  createEffect(()=>{
    if(activeLedger().length > 0) return
    const currentPath = location.pathname
    const ledgers = ['eth', 'fabric']

     ledgers.forEach(ledger => {
      if(currentPath.includes(ledger)){
        setActiveLedger(ledger)
      }
    })
  })

  return (
    <div class={styles["nav-bar"]}>
      <Select
        value={activeLedger()}
        onSelect={(val: string) => {
          handleSelect(val);
        }}
      />
      <nav class={styles.navigation}>
        <Show when={activeLedger().length > 0}>
          <For each={activeLedger() === "eth" ? pathsEth : pathsFabric}>
            {(item) => (
              <Button onClick={() => navigate(item.path)} type="menu">
                {item.title}
              </Button>
            )}
          </For>
        </Show>
      </nav>
    </div>
  );
};

export default Menu;
