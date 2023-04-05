// @ts-expect-error
import styles from "./Details.module.css";
import { createEffect, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import { supabase } from "../../supabase-client";
import { STANDARDS } from "../../schema/token-standards";
import { ERC20Txn, ERC721Txn } from "../../schema/supabase-types";

const TokenTransactionDetails = () => {
  const [txnData, setTxnData] = createSignal<ERC20Txn | ERC721Txn | any>({});
  const params = useParams();

  createEffect(async () => {
    try {
      const { data, error } = await supabase
        .from(`token_${params.standard.toLowerCase()}`)
        .select("*")
        .match({ account_address: params.address });
      if (data?.[0]) {
        setTxnData(data[0]);
      } else {
        throw new Error("Failed to load transaction details");
      }
    } catch (error) {
      console.error(error.message);
    }
  }, []);

  return (
    <div class={styles["details"]}>
      <div class={styles["details-card"]}>
        <h1>Details of Transaction</h1>
        <span>
          {" "}
          <b>Address: </b>
          {txnData()?.account_address}{" "}
        </span>
        <span>
          {" "}
          <b>Created_at: </b>
          {txnData()?.token_address}
        </span>
        {params.standard === STANDARDS.erc20 && (
          <span>
            {" "}
            <b>Balance: </b>
            {txnData()?.balance}
          </span>
        )}
        {params.standard === STANDARDS.erc721 && (
          <span>
            {" "}
            <b>Uri: </b>
            {txnData()?.uri}
          </span>
        )}
      </div>
    </div>
  );
};

export default TokenTransactionDetails;
