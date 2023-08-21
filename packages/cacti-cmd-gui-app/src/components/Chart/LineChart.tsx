import { SolidApexCharts } from "solid-apexcharts";
import { createSignal, createEffect, Component } from "solid-js";
import moment from "moment";
import { balanceDate } from "../../schema/supabase-types";
// @ts-expect-error
import styles from "./Chart.module.css";

const LineChart: Component<{ chartData: any }> = (props) => {
  const [chartProps, setChartProps] = createSignal({
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
        categories: [],
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
        stroke: {
          curve: "stepline",
        },
        tooltip: {
          x: {
            show: true,
            format: "dd MM yyyy h:mm",
            formatter: undefined,
          },
        },
        xaxis: {
          type: "datetime",
          categories: chartData()?.map((txn: balanceDate) =>
            moment(txn.created_at).format("YYYY-MM-DD h:mm:ss a"),
          ),
          labels: {
            format: "dd MM yyyy h:mm",
          },
        },
      },
      series: {
        list: [
          {
            name: "balance",
            data: chartData()?.map((txn: balanceDate) => txn.balance),
          },
        ],
      },
    });
  });

  return (
    <div class={styles["chart-wrapper-line"]}>
      <SolidApexCharts
        width="1600"
        height="250"
        type="line"
        options={chartProps().options}
        series={chartProps().series.list}
      />
    </div>
  );
};

export default LineChart;
