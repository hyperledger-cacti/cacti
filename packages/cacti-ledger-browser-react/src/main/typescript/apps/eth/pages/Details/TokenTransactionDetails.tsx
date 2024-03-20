import { supabase } from "../../../../common/supabase-client";
import { STANDARDS } from "../../../../common/token-standards";
import { ERC20Txn, ERC721Txn } from "../../../../common/supabase-types";

import styles from "./Details.module.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TokenTransactionDetails = () => {
  const [txnData, setTxnData] = useState<ERC20Txn | ERC721Txn | any>({});
  const params = useParams();

  const fethcData = async () => {
    try {
      const { data } = await supabase
        .from(`token_${params.standard?.toLowerCase()}`)
        .select("*")
        .match({ account_address: params.address });
      if (data?.[0]) {
        setTxnData(data[0]);
      } else {
        throw new Error("Failed to load transaction details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fethcData();
  }, []);

  return (
    <div className={styles["details"]}>
      <div className={styles["details-card"]}>
        <h1>Details of Transaction</h1>
        <p>
          {" "}
          <b>Address: </b>
          {txnData?.account_address}{" "}
        </p>
        <p>
          {" "}
          <b>Created_at: </b>
          {txnData?.token_address}
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
