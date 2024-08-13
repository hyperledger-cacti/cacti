import Chart from "react-apexcharts";
import { useTheme } from "@mui/material";

import { BalanceHistoryListData } from "./balanceHistory";

export type ERC20BalanceHistoryChartProps = {
  data: BalanceHistoryListData[];
  height?: string | number;
};

export default function ERC20BalanceHistoryChart({
  data,
  height,
}: ERC20BalanceHistoryChartProps) {
  if (!data) {
    return;
  }

  const theme = useTheme();

  return (
    <>
      {/* Style overwrite for Apex Charts to use colors from the theme for toolbar buttons (right-top of the chart) */}
      <style>
        {`
          .apexcharts-zoom-icon.apexcharts-selected svg {
            fill: ${theme.palette.secondary.main} !important;
          }

          .apexcharts-pan-icon.apexcharts-selected svg {
            stroke: ${theme.palette.secondary.main} !important;
          }
        `}
      </style>

      {/* Chart component */}
      <Chart
        options={{
          chart: {
            type: "line",
            zoom: {
              enabled: true,
              type: "x",
              autoScaleYaxis: true,
            },
            toolbar: {
              autoSelected: "zoom",
              tools: {
                zoom: true,
                zoomin: true,
                zoomout: true,
                pan: true,
                reset: true,
              },
            },
          },
          colors: [theme.palette.primary.main],
          xaxis: {
            type: "datetime",
            categories: data?.map((txn) => txn.created_at),
            labels: {
              format: "dd-MM-yyyy h:mm",
            },
          },
          yaxis: {
            title: {
              text: "Balance",
            },
          },
          stroke: {
            curve: "stepline",
          },
          markers: {
            size: 6,
          },
          tooltip: {
            x: {
              format: "dd-MM-yyyy h:mm:ss",
            },
          },
        }}
        series={[
          {
            name: "Balance",
            data: data.map((txn) => txn.balance),
          },
        ]}
        type="line"
        height={height}
      />
    </>
  );
}
