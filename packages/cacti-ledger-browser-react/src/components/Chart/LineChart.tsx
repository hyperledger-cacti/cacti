import Chart from "react-apexcharts";
import moment from "moment";
import { balanceDate } from "../../schema/supabase-types";
import styles from "./Chart.module.css";
import { useEffect, useState } from "react";

function LineChart(props) {
  const [chartProps, setChartProps] = useState({
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
        id: "chart-example",
      },
      xaxis: {
        categories: [],
      },
    },
  });

  useEffect(() => {
    const { chartData } = props;

    setChartProps({
      options: {
        chart: {
          id: "chart-example",
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
          categories: chartData?.map((txn: balanceDate) =>
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
            data: chartData?.map((txn: balanceDate) => txn.balance),
          },
        ],
      },
    });
  });

  return (
    <div className={styles["chart-wrapper-line"]}>
      <Chart
        width="1600"
        height="250"
        type="line"
        options={chartProps.options}
        series={chartProps.series.list}
      />
    </div>
  );
}

export default LineChart;
