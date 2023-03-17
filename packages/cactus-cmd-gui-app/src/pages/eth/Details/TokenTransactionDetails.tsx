import { createEffect, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import { STANDARDS } from "../../../schema/token-standards";
import { ERC20Txn, ERC721Txn } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./Details.module.css";

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
    } catch (error:any) {
      console.error(error.message);
    }
  }, []);

  return (
    <div class={styles["details"]}>
      <div class={styles["details-card"]}>
        <h1>Details of Transaction</h1>
        <p>
          {" "}
          <b>Address: </b>
          {txnData()?.account_address}{" "}
        </p>
        <p>
          {" "}
          <b>Created_at: </b>
          {txnData()?.token_address}
        </p>
        {params.standard === STANDARDS.erc20 && (
          <p>
            {" "}
            <b>Balance: </b>
            {txnData()?.balance}
          </p>
        )}
        {params.standard === STANDARDS.erc721 && (
          <p>
            {" "}
            <b>Uri: </b>
            {txnData()?.uri}
          </p>
        )}
      </div>
    </div>
  );
};

export default TokenTransactionDetails;
