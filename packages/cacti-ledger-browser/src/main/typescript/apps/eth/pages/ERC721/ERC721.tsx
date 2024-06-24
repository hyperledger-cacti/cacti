import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./ERC721.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethAllERC721History, ethERC721TokensByTxId } from "../../queries";
import TokenAccount from "../../components/TokenHeader/TokenAccount";

function ERC721() {
  const params = useParams();
  if (typeof params.account === "undefined") {
    throw new Error(`ERC721 list called with empty account address ${params}`);
  }
  const navigate = useNavigate();
  const {
    isError: isTokenListError,
    data: tokenList,
    error: tokenListError,
  } = useQuery(ethERC721TokensByTxId(params.account));
  const {
    isError: isTokenMetadataError,
    data: tokenMetadata,
    error: tokenMetadataError,
  } = useQuery(ethAllERC721History());

  if (isTokenListError) {
    console.error("Token list for account fetch error:", tokenListError);
  }

  if (isTokenMetadataError) {
    console.error("Token metadata fetch error:", tokenMetadataError);
  }

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

  return (
    <div className={styles["erc-content"]}>
      <CardWrapper
        columns={ercTableProps}
        data={tokenList ?? []}
        display={"small"}
        title={"ERC721"}
        filters={["symbol"]}
      ></CardWrapper>
      <div className={styles["erc-wrap"]}>
        <TokenAccount accountNum={params.account} />
        <CardWrapper
          columns={metaProps}
          data={tokenMetadata ?? []}
          display={"all"}
          title={"Transactions"}
          filters={["token_address", "sender", "recipient"]}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default ERC721;
