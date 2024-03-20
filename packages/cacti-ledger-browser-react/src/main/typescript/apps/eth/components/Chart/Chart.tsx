import Chart from "react-apexcharts";
import { ERC20Txn } from "../../schema/supabase-types";

import styles from "./Chart.module.css";

function ApexChart(props) {
  const chartProps = {
    options: {
      chart: {
        id: "chart-example",
      },
      xaxis: {
        categories: props.chartData?.map((txn: ERC20Txn) => txn.token_address),
      },
    },
    series: [
      {
        name: "balance",
        data: props.chartData?.map((txn: ERC20Txn) => txn.balance),
      },
    ],
  };

  console.log(chartProps.options);
  return (
    <div className={styles["chart-wrapper"]}>
      <Chart
        width="650"
        type="bar"
        options={chartProps.options}
        series={chartProps.series}
      />
    </div>
  );
}

export default ApexChart;
