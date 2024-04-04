import TokenAccount from "../../../../components/TokenHeader/TokenAccount";
import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import Chart from "../../components/Chart/Chart";
import { ERC20Txn } from "../../../../common/supabase-types";
import styles from "./ERC20.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const ERC20 = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [token_erc20, setToken_erc20] = useState<ERC20Txn[]>([]);

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

  useEffect(() => {
    fetchERC20();
  }, []);

  return (
    <div className={styles["erc-content"]}>
      <div className={styles["erc-wrap"]}>
        <TokenAccount accountNum={params.account} />
        <CardWrapper
          columns={ercTableProps}
          data={token_erc20}
          display={"wide"}
          title={"ERC20"}
          filters={["token_address"]}
        />
      </div>
      <div className={styles["erc-wrap"]}>
        <Chart chartData={token_erc20} />
      </div>
    </div>
  );
};

export default ERC20;
