import Button from "../Button/Button";
import { useNavigate } from "@solidjs/router";
// @ts-expect-error
import styles from "./Menu.module.css";

const Menu = () => {
  const navigate = useNavigate();
  return (
    <nav class={styles.navigation}>
      <Button onClick={() => navigate(`/`)} type="menu">
        DASHBOARD
      </Button>
      <Button onClick={() => navigate(`/accounts/ERC20/`)} type="menu">
        ERC20
      </Button>
      <Button onClick={() => navigate(`/accounts/ERC721`)} type="menu">
        NFT ERC721
      </Button>
    </nav>
  );
};

export default Menu;
