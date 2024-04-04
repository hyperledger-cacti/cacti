import TokenAccount from "../../../../components/TokenHeader/TokenAccount";
import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./ERC721.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ERC721Txn, TokenMetadata721 } from "../../../../common/supabase-types";

function ERC721() {
  const params = useParams();
  const navigate = useNavigate();
  const [token_erc721, setToken_erc721] = useState<ERC721Txn[]>([]);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata721[]>([]);

  const ercTableProps = {
    onClick: {
      action: (param: string) => navigate(`/eth/token-details/erc721/${param}`),
      prop: "token_address",
    },
    schema: [
      {
        display: "symbol",
        objProp: ["symbol"],
      },
      {
        display: "URI",
        objProp: ["uri"],
      },
    ],
  };
  const metaProps = {
    onClick: {
      action: () => {},
      prop: "",
    },
    schema: [
      {
        display: "created at",
        objProp: ["created_at"],
      },
      {
        display: "sender/recipient",
        objProp: ["sender", "recipient"],
      },
      {
        display: "token address",
        objProp: ["token_address"],
      },
    ],
  };

  const fetchERC721 = async () => {
    try {
      const { data, error } = await supabase
        .from("erc721_txn_meta_view")
        .select()
        .eq("account_address", params.account);
      if (data) {
        setToken_erc721(data);
      }
      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data, error } = await supabase
        .from(`erc721_token_history_view`)
        .select("*");
      if (data) {
        setTokenMetadata(data);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchERC721();
    fetchMetadata();
  }, []);

  return (
    <div className={styles["erc-content"]}>
      <CardWrapper
        columns={ercTableProps}
        data={token_erc721}
        display={"small"}
        title={"ERC721"}
        filters={["symbol"]}
      ></CardWrapper>
      <div className={styles["erc-wrap"]}>
        <TokenAccount accountNum={params.account} />
        <CardWrapper
          columns={metaProps}
          data={tokenMetadata}
          display={"all"}
          title={"Transactions"}
          filters={["token_address", "sender", "recipient"]}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default ERC721;
