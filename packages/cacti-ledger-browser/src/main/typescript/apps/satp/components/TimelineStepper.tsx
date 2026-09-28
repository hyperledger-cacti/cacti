import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CircularProgress from "@mui/material/CircularProgress";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { SessionStageStepInfo } from "../types";

export interface TimelineStepperProps {
  stages: SessionStageStepInfo[];
  activeStepName?: string;
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({
  stages,
  activeStepName,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight="bold">
          SATP Protocol Lifecycle Stages
        </Typography>
        {activeStepName && (
          <Chip
            label={`Current Step: ${activeStepName}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      <Stepper alternativeLabel sx={{ pt: 2, pb: 1 }}>
        {stages.map((stage) => {
          let StepIconComponent: React.ReactNode;
          let labelColor = "text.secondary";

          if (stage.status === "completed") {
            StepIconComponent = (
              <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
            );
            labelColor = "success.main";
          } else if (stage.status === "failed") {
            StepIconComponent = (
              <ErrorIcon color="error" sx={{ fontSize: 28 }} />
            );
            labelColor = "error.main";
          } else if (stage.status === "in-progress") {
            StepIconComponent = (
              <CircularProgress size={24} thickness={5} color="primary" />
            );
            labelColor = "primary.main";
          } else {
            StepIconComponent = (
              <RadioButtonUncheckedIcon
                color="disabled"
                sx={{ fontSize: 24 }}
              />
            );
          }

          return (
            <Step
              key={stage.stageId}
              active={stage.status === "in-progress"}
              completed={stage.status === "completed"}
            >
              <StepLabel
                StepIconComponent={() => <Box>{StepIconComponent}</Box>}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  sx={{ color: labelColor }}
                >
                  {stage.stageName}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  {stage.description}
                </Typography>
                {stage.timestamp && (
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.disabled"
                    sx={{ mt: 0.5, fontSize: "0.7rem" }}
                  >
                    {new Date(stage.timestamp).toLocaleTimeString()}
                  </Typography>
                )}
                {stage.activeStep && (
                  <Chip
                    label={stage.activeStep}
                    size="small"
                    color={stage.status === "failed" ? "error" : "primary"}
                    sx={{ mt: 1, fontSize: "0.65rem", height: 20 }}
                  />
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Paper>
  );
};
