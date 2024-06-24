import CardWrapper from "../../../../components/ui/CardWrapper";
import LineChart from "../../components/Chart/LineChart";
import styles from "./SingleTokenHistory.module.css";
import EmptyTablePlaceholder from "../../../../components/ui/EmptyTablePlaceholder/EmptyTablePlaceholder";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethERC20TokensHistory } from "../../queries";
import TokenHeader from "../../components/TokenHeader/TokenHeader";

type ObjectKey = keyof typeof styles;

const SingleTokenHistory = () => {
  const params = useParams();
  if (
    typeof params.address === "undefined" ||
    typeof params.account === "undefined"
  ) {
    throw new Error(`ERC20 called with empty token or owner address ${params}`);
  }
  const {
    isError,
    data: txData,
    error,
  } = useQuery(ethERC20TokensHistory(params.address, params.account));

  const {
    data: balanceHistory,
    isError: isBalanceHistoryError,
    error: balanceHistoryError,
  } = useQuery({
    queryKey: ["balanceHistory", txData],
    queryFn: () => {
      let balance = 0;
      const balances = (txData ?? []).map((txn) => {
        let txn_value = txn.value || 0;
        if (txn.recipient !== params.account) {
          txn_value *= -1;
        }
        balance += txn_value;
        return {
          created_at: txn.created_at + "Z",
          balance: balance,
        };
      });
      return balances;
    },
    enabled: !!txData,
  });

  if (isError) {
    console.error("Token history fetch error:", error);
  }

  if (isBalanceHistoryError) {
    console.error("Balance history calculation error:", balanceHistoryError);
  }

  const tokenTableProps = {
    schema: [
      {
        display: "created at",
        objProp: ["created_at"],
      },
      {
        display: "transaction hash",
        objProp: ["transaction_hash"],
      },
      {
        display: "sender/recipient",
        objProp: ["sender", "recipient"],
      },
      {
        display: "token address",
        objProp: ["token_address"],
      },
      {
        display: "token value",
        objProp: ["value"],
      },
    ],
  };

  return (
    <div className={styles["token-history" as ObjectKey]}>
      <TokenHeader accountNum={params.account} tokenAddress={params.address} />
      <div className={styles["transactions" as ObjectKey]}>
        {txData && txData.length > 0 ? (
          <>
            <LineChart chartData={balanceHistory} />
            <CardWrapper
              columns={tokenTableProps}
              data={txData}
              title={"Token history"}
              display={"all"}
              filters={[
                "transaction_hash",
                "sender",
                "recipient",
                "token_address",
              ]}
              trimmed={false}
            ></CardWrapper>
          </>
        ) : (
          <EmptyTablePlaceholder />
        )}
      </div>
    </div>
  );
};

export default SingleTokenHistory;
