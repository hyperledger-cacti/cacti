import { useParams, useNavigate } from "@solidjs/router";
import { createSignal, createEffect } from "solid-js";
import TokenAccount from "../../../components/TokenHeader/TokenAccount";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";
import Chart from "../../../components/Chart/Chart";
import { ERC20Txn } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./ERC20.module.css";

const ERC20 = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [token_erc20, setToken_erc20] = createSignal<ERC20Txn[]>([]);

  const ercTableProps = {
    onClick: {
      action: (token_address: string) =>
        navigate(`/eth/erc20/trend/${params.account}/${token_address}`),
      prop: "token_address",
    },
    schema: [
      {
        display: "token address",
        objProp: ["token_address"],
      },
      {
        display: "balance",
        objProp: ["balance"],
      },
    ],
  };

  const fetchERC20 = async () => {
    try {
      const { data, error } = await supabase
        .from("token_erc20")
        .select()
        .eq("account_address", params.account);
      if (data) {
        setToken_erc20(data);
      }
      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchERC20();
  }, []);

  return (
    <div class={styles["erc-content"]}>
            <div class={styles["erc-wrap"]}>
            <TokenAccount accountNum={params.account} />
      <CardWrapper
        columns={ercTableProps}
        data={token_erc20()}
        display={"wide"}
        title={"ERC20"}
        filters={["token_address"]}
      />
      </div>
      <div class={styles["erc-wrap"]}>

        <Chart chartData={token_erc20} />
      </div>
    </div>
  );
};

export default ERC20;
