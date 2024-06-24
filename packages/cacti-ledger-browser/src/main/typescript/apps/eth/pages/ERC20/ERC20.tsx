import CardWrapper from "../../../../components/ui/CardWrapper";
import Chart from "../../components/Chart/Chart";
import styles from "./ERC20.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethERC20TokensByOwner } from "../../queries";
import TokenAccount from "../../components/TokenHeader/TokenAccount";

const ERC20 = () => {
  const params = useParams();
  if (typeof params.account === "undefined") {
    throw new Error(`ERC20 called with empty account address ${params}`);
  }
  const navigate = useNavigate();
  const { isError, data, error } = useQuery(
    ethERC20TokensByOwner(params.account),
  );
  if (isError) {
    console.error("Data fetch error:", error);
  }

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

  return (
    <div className={styles["erc-content"]}>
      <div className={styles["erc-wrap"]}>
        <TokenAccount accountNum={params.account} />
        <CardWrapper
          columns={ercTableProps}
          data={data ?? []}
          display={"wide"}
          title={"ERC20"}
          filters={["token_address"]}
        />
      </div>
      <div className={styles["erc-wrap"]}>
        <Chart chartData={data ?? []} />
      </div>
    </div>
  );
};

export default ERC20;
