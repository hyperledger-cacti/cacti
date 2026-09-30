import * as React from "react";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorIcon from "@mui/icons-material/Error";
import UndoIcon from "@mui/icons-material/Undo";
import { SatpKpiMetrics } from "../types";

export interface MetricsSummaryCardsProps {
  metrics: SatpKpiMetrics;
}

export const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = ({
  metrics,
}) => {
  const cards = [
    {
      title: "Total Transfers",
      count: metrics.totalTransfers,
      color: "primary.main",
      icon: <SwapHorizIcon sx={{ fontSize: 32, color: "primary.main" }} />,
      subtitle: "Recorded sessions",
    },
    {
      title: "Completed",
      count: metrics.completed,
      color: "success.main",
      icon: <CheckCircleIcon sx={{ fontSize: 32, color: "success.main" }} />,
      subtitle:
        metrics.totalTransfers > 0
          ? `${Math.round((metrics.completed / metrics.totalTransfers) * 100)}% success rate`
          : "0% success rate",
    },
    {
      title: "In Progress",
      count: metrics.inProgress,
      color: "info.main",
      icon: <HourglassEmptyIcon sx={{ fontSize: 32, color: "info.main" }} />,
      subtitle: "Active transfers",
    },
    {
      title: "Failed",
      count: metrics.failed,
      color: "error.main",
      icon: <ErrorIcon sx={{ fontSize: 32, color: "error.main" }} />,
      subtitle: "Errors / Rejected",
    },
    {
      title: "Rollbacks",
      count: metrics.rollback,
      color: "warning.main",
      icon: <UndoIcon sx={{ fontSize: 32, color: "warning.main" }} />,
      subtitle: "Refunded / Aborted",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={2.4} key={card.title}>
          <Paper
            elevation={2}
            sx={{
              p: 2.5,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition:
                "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 4,
              },
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight="bold"
              >
                {card.title}
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ my: 0.5, color: card.color }}
              >
                {card.count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {card.subtitle}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
              }}
            >
              {card.icon}
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
