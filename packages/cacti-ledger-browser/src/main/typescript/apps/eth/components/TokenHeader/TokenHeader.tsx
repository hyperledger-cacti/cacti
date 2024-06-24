import TokenAccount from "./TokenAccount";
import styles from "./TokenHeader.module.css";
import { ethTokenDetails } from "../../queries";
import { useQuery } from "@tanstack/react-query";
import { TokenMetadata20 } from "../../../../common/supabase-types";

function TokenHeader(props: { accountNum: string; tokenAddress: string }) {
  const { isError, data, error } = useQuery(
    ethTokenDetails("erc20", props.tokenAddress),
  );

  if (isError) {
    console.error("Token header fetch error:", error);
  }

  console.log(data);

  return (
    <div className={styles["token-header"]}>
      <TokenAccount accountNum={props.accountNum} />
      <div className={styles["token-details"]}>
        <p>
          <b>Address:</b> {props.tokenAddress}
        </p>
        <p>
          <b>Created at:</b> {data?.created_at}
        </p>
        <p>
          <b>Total supply: </b>
          {(data as TokenMetadata20).total_supply}
        </p>
      </div>
    </div>
  );
}

export default TokenHeader;
