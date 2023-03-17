import { SolidApexCharts } from "solid-apexcharts";
import { createSignal, createEffect, Component } from "solid-js";
import { ERC20Txn } from "../../schema/supabase-types";
// @ts-expect-error
import styles from "./Chart.module.css";

const Chart: Component<{ chartData: any }> = (props) => {
  const [chartProps, setChartProps] = createSignal<{
    series: any;
    options: any;
  }>({
    series: {
      list: [
        {
          name: "balance",
          data: [],
        },
      ],
    },
    options: {
      chart: {
        id: "solidchart-example",
      },
      xaxis: {
        type: "datetime",
      },
    },
  });

  createEffect(async () => {
    const { chartData } = props;

    setChartProps({
      options: {
        chart: {
          id: "solidchart-example",
        },
        xaxis: {
          categories: chartData()?.map((txn: ERC20Txn) => txn.token_address),
        },
      },
      series: {
        list: [
          {
            name: "balance",
            data: chartData()?.map((txn: ERC20Txn) => txn.balance),
          },
        ],
      },
    });
  });

  return (
    <div class={styles["chart-wrapper"]}>
      <span>Balance</span>
      <SolidApexCharts 
        width={650}
        type="bar"
        options={chartProps().options}
        series={chartProps().series.list}
      />
    </div>
  );
};

export default Chart;
