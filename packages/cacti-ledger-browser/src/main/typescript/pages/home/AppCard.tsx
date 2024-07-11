import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { AppInstance, AppStatus } from "../../common/types/app";
import ConfigureApp from "../configure-app/ConfigureApp";

type StatusTextProps = {
  status: AppStatus;
};

/**
 * Application status text with color according to it's severity.
 */
function StatusText({ status }: StatusTextProps) {
  const theme = useTheme();

  return (
    <span style={{ color: theme.palette[status.severity].main }}>
      {status.message}
    </span>
  );
}

type InitializedTextProps = {
  isInitialized: boolean;
};

/**
 * Application initialization status text - `error` color if not initialized, `success` otherwise.
 */
function InitializedText({ isInitialized }: InitializedTextProps) {
  let text = "No";
  let textColor: "error" | "success" = "error";

  if (isInitialized) {
    text = "Yes";
    textColor = "success";
  }

  return <StatusText status={{ severity: textColor, message: text }} />;
}

type StatusDialogButtonProps = {
  statusComponent: React.ReactElement;
};

function StatusDialogButton({ statusComponent }: StatusDialogButtonProps) {
  const [openDialog, setOpenDialog] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>Status</Button>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => setOpenDialog(false)}
        open={openDialog}
      >
        <DialogTitle color="primary">App Status</DialogTitle>
        <DialogContent>{statusComponent}</DialogContent>
      </Dialog>
    </>
  );
}

type ConfigureDialogButtonProps = {
  appInstanceId: string;
};

function ConfigureDialogButton({ appInstanceId }: ConfigureDialogButtonProps) {
  const [openDialog, setOpenDialog] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>Configure</Button>
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenDialog(false)}
        open={openDialog}
      >
        <DialogTitle color="primary">Configure Application</DialogTitle>
        <DialogContent>
          <ConfigureApp
            appInstanceId={appInstanceId}
            handleDone={() => setOpenDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

type AppCardProps = {
  appConfig: AppInstance;
};

/**
 * Application card component. Shows basic information and allows navigation to
 * specific app on click. Has action for showing app status and configuration
 * pop-ups.
 */
export default function AppCard({ appConfig }: AppCardProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const status = appConfig.useAppStatus();

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 400,
      }}
    >
      <CardActionArea
        onClick={() => {
          navigate(appConfig.path);
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            paddingBottom: 1,
          }}
        >
          <Typography variant="h5" component="div" color="secondary.main">
            {appConfig.instanceName}
          </Typography>
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            {appConfig.appName}
          </Typography>
          {appConfig.description && (
            <Typography sx={{ mb: 1.5 }}>{appConfig.description}</Typography>
          )}
          <Typography>
            Initialized:{" "}
            {status.isPending ? (
              <CircularProgress size={17} />
            ) : (
              <InitializedText isInitialized={status.isInitialized} />
            )}
          </Typography>
          <Typography>
            Status:{" "}
            {status.isPending ? (
              <CircularProgress size={17} />
            ) : (
              <StatusText status={status.status} />
            )}
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions
        sx={{
          marginTop: 0,
          justifyContent: "right",
          borderTop: 1,
          borderColor: theme.palette.primary.main,
        }}
      >
        <ConfigureDialogButton appInstanceId={appConfig.id} />
        <StatusDialogButton statusComponent={appConfig.StatusComponent} />
      </CardActions>
    </Card>
  );
}
