import styles from "./TokenHeader.module.css";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

function TokenAccount(props: any) {
  return (
    <div className={styles["token-account"]}>
      <span>
        {" "}
        <span className={styles["token-account-icon"]}>
          <AccountBalanceWalletIcon />
        </span>{" "}
        {props.accountNum}
      </span>
    </div>
  );
}

export default TokenAccount;
