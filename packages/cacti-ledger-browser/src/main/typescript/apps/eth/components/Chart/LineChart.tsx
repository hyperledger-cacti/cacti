import Chart from "react-apexcharts";
import moment from "moment";

import styles from "./Chart.module.css";
import { useEffect, useState } from "react";
import { balanceDate } from "../../../../common/supabase-types";

interface ChartProps {
  series: {
    list: {
      name: string;
      data: any[]; 
    }[];
  };
  options: {
    stroke: Record<string, any>;
    tooltip: Record<string, any>;
    chart: {
      id: string;
    };
    xaxis: {
      type: "datetime" | "category" | "numeric" | undefined;
      categories: any[]; 
      labels: Record<string, any>;
    };
  };
}

function LineChart(props:any ) {
  const [chartProps, setChartProps] = useState<ChartProps>({
    series: {
      list: [
        {
          name: "balance",
          data: [],
        },
      ],
    },
    options: {
      stroke: {},
      tooltip: {
      },
      chart: {
        id: "chart-example",
      },
      xaxis: {
        type: undefined,
        categories: [],
        labels: {}
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
