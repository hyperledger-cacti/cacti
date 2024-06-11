import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import LineChart from "../../components/Chart/LineChart";
import TokenHeader from "../../../../components/TokenHeader/TokenHeader";
import { TokenHistoryItem20 } from "../../../../common/supabase-types";
import { balanceDate } from "../../../../common/supabase-types";
import styles from "./SingleTokenHistory.module.css";
import EmptyTablePlaceholder from "../../../../components/ui/EmptyTablePlaceholder/EmptyTablePlaceholder";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SingleTokenHistory = () => {
  type ObjectKey = keyof typeof styles;
  const [transactions, setTransactions] = useState<TokenHistoryItem20[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<balanceDate[]>([]);
  const navigate = useNavigate();
  const params = useParams();

  const tokenTableProps = {
    onClick: {
      action: (param: string) => navigate(`/view/${param}`),
      prop: "id",
    },
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

  const calcTokenBalance = (txnData: TokenHistoryItem20[]) => {
    let balance = 0;
    const balances = txnData.map((txn) => {
      let txn_value = txn.value || 0;
      let account = params.account;
      if (txn.recipient !== account) {
        txn_value *= -1;
      }
      balance += txn_value;
      return {
        created_at: txn.created_at + "Z",
        balance: balance,
      };
    });
    return balances;
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("erc20_token_history_view")
        .select("*")
        .match({ token_address: params.address })
        .or(`sender.eq.${params.account}, recipient.eq.${params.account}`);
      if (data) {
        setTransactions(data);
        setBalanceHistory(calcTokenBalance(data));
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className={styles["token-history" as ObjectKey]}>
      <TokenHeader accountNum={params.account} token_address={params.address} />
      <div className={styles["transactions" as ObjectKey]}>
        {transactions.length > 0 ? (
          <>
            <LineChart chartData={balanceHistory} />
            <CardWrapper
              columns={tokenTableProps}
              data={transactions}
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

        {/* <Show
          when={transactions.length > 0}
          fallback={<EmptyTablePlaceholder />}
        >
          <LineChart chartData={balanceHistory} />
          <CardWrapper
            columns={tokenTableProps}
            data={transactions}
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
        </Show> */}
      </div>
    </div>
  );
};

export default SingleTokenHistory;
