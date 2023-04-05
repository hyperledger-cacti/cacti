import { createSignal, createEffect } from "solid-js";
import { supabase } from "../../supabase-client";
import CardWrapper from "../../components/CardWrapper/CardWrapper";
import LineChart from "../../components/Chart/LineChart";
// @ts-expect-error
import styles from "./SingleTokenHistory.module.css";
import TokenHeader from "../../components/TokenHeader/TokenHeader";
import { useNavigate, useParams } from "@solidjs/router";
import { TokenHistoryItem20 } from "../../schema/supabase-types";
import { balanceDate } from "../../schema/supabase-types";

const SingleTokenHistory = () => {
  type ObjectKey = keyof typeof styles;
  const [transactions, setTransactions] = createSignal<TokenHistoryItem20[]>(
    [],
  );
  const [balanceHistory, setBalanceHistory] = createSignal<balanceDate[]>([]);
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
        .match({ token_address: params.address }).or(`sender.eq.${params.account}, recipient.eq.${params.account}`);
      if (data) {
        setTransactions(data);
        setBalanceHistory(calcTokenBalance(data));
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error:any) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchTransactions();
  }, []);

  return (
    <div class={styles["token-history" as ObjectKey]}>
      <TokenHeader accountNum={params.account} token_address={params.address} />
      <LineChart chartData={balanceHistory} />
      <div class={styles["transactions" as ObjectKey]}>
        {transactions().length > 0 ? (
          <CardWrapper
            columns={tokenTableProps}
            data={transactions()}
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
        ) : (
          <p>No data</p>
        )}
      </div>
    </div>
  );
};

export default SingleTokenHistory;
