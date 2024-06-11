import TokenAccount from "./TokenAccount";
import { TokenMetadata20 } from "../../common/supabase-types";
import { supabase } from "../../common/supabase-client";
import styles from "./TokenHeader.module.css";
import { useEffect, useState } from "react";

function TokenHeader(props: any) {
  const [tokenData, setTokenData] = useState<TokenMetadata20 | any>();

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from(`token_metadata_erc20`)
        .select("*")
        .match({ address: props.token_address });
      console.log(data);
      if (data?.[0]) {
        setTokenData(data[0]);
      } else {
        throw new Error("Failed to load token details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={styles["token-header"]}>
      <TokenAccount accountNum={props.accountNum} />
      <div className={styles["token-details"]}>
        <p>
          <b>Address:</b> {props.token_address}
        </p>
        <p>
          <b>Created at:</b> {tokenData?.created_at}
        </p>
        <p>
          <b>Total supply: </b>
          {tokenData?.total_supply}
        </p>
      </div>
    </div>
  );
}

export default TokenHeader;
