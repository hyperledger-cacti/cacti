import { BiRegularWallet } from "solid-icons/bi";
import { Component } from "solid-js";
// @ts-expect-error
import styles from "./TokenHeader.module.css";

const TokenAccount: Component<{ accountNum: string }> = (props) => {
  return (
    <div class={styles["token-account"]}>
      <span>
        {" "}
        <span class={styles["token-account-icon"]}>
          <BiRegularWallet />
        </span>{" "}
        {props.accountNum}
      </span>
    </div>
  );
};

export default TokenAccount;
