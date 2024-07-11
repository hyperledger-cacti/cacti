import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  deleteGuiAppConfig,
  guiAppConfigById,
  invalidateGuiAppConfig,
  updateGuiAppConfig,
} from "../../common/queries";
import { UpdateGuiAppConfigType } from "../../common/types/app";
import { useNotification } from "../../common/context/NotificationContext";
import AppSetupForm from "../../components/AppSetupForms/AppSetupForm";
import AppOptionsForm from "../../components/AppSetupForms/AppOptionsForm";

type DeleteWithConfirmationButtonProps = {
  appInstanceId: string;
  handleDone: () => void;
};

/**
 * Button and logic for removing the application from a database.
 */
function DeleteWithConfirmationButton({
  appInstanceId,
  handleDone,
}: DeleteWithConfirmationButtonProps) {
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = React.useState(false);
  const deleteGuiAppMutation = useMutation({
    mutationFn: () => deleteGuiAppConfig(appInstanceId),
    onSuccess: () => invalidateGuiAppConfig(queryClient),
  });

  const handleClose = () => {
    setOpenDialog(false);
  };

  // Show error if app can't be deleted from the database
  React.useEffect(() => {
    if (deleteGuiAppMutation.isError) {
      showNotification(
        `Could not delete application ${appInstanceId}, error: ${deleteGuiAppMutation.error}`,
        "error",
      );
      deleteGuiAppMutation.reset();
    }
  }, [deleteGuiAppMutation.isError]);

  // Show success message and terminate if data was saved successfully
  React.useEffect(() => {
    if (deleteGuiAppMutation.isSuccess) {
      showNotification(
        `Application ${appInstanceId} removed successfully`,
        "success",
      );
      deleteGuiAppMutation.reset();
      handleDone();
    }
  }, [deleteGuiAppMutation.isSuccess]);

  return (
    <>
      <LoadingButton
        color="error"
        loading={deleteGuiAppMutation.isPending}
        loadingPosition="start"
        size="large"
        startIcon={<DeleteIcon />}
        onClick={() => setOpenDialog(true)}
        sx={{ marginRight: 1 }}
        variant="contained"
      >
        Delete
      </LoadingButton>

      <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={openDialog}>
        <DialogTitle color="primary">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this application? This action is
            irreversible. You will need to set it up again if you proceed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              handleClose();
              deleteGuiAppMutation.mutate();
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export interface ConfigureAppProps {
  appInstanceId: string;
  handleDone: () => void;
}

/**
 * View to edit or delete an application.
 */
export default function ConfigureApp({
  appInstanceId,
  handleDone,
}: ConfigureAppProps) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [jsonValidationError, setJsonValidationError] = React.useState("");
  const [commonSetupValues, setCommonSetupValues] = React.useState({
    instanceName: "",
    description: "",
    path: "",
  });
  const [appOptionsJsonString, setAppOptionsJsonString] = React.useState("");
  const updateGuiAppMutation = useMutation({
    mutationFn: (data: UpdateGuiAppConfigType) =>
      updateGuiAppConfig(appInstanceId, data),
    onSuccess: () => invalidateGuiAppConfig(queryClient),
  });
  const appConfigQuery = useQuery(guiAppConfigById(appInstanceId));
  const appConfigData = appConfigQuery.data;

  // Set current app configuration values to the form once data is received from the database
  React.useEffect(() => {
    if (appConfigData && !appConfigQuery.isPending) {
      setCommonSetupValues({
        instanceName: appConfigData.instance_name,
        description: appConfigData.description,
        path: appConfigData.path,
      });
      setAppOptionsJsonString(
        JSON.stringify(appConfigData.options, undefined, 2),
      );
    }
  }, [appConfigData]);

  // Show error if current data can't be fetched from the database
  React.useEffect(() => {
    if (appConfigQuery.isError) {
      showNotification(
        `Could not fetch ${appInstanceId} application config: ${appConfigQuery.error}`,
        "error",
      );
    }
  }, [appConfigQuery.isError]);

  // Show error if updates can't be saved to the database
  React.useEffect(() => {
    if (updateGuiAppMutation.isError) {
      showNotification(
        `Could not save ${appInstanceId} updated application config: ${updateGuiAppMutation.error}`,
        "error",
      );
      updateGuiAppMutation.reset();
    }
  }, [updateGuiAppMutation.isError]);

  // Show success message and terminate if data was saved successfully
  React.useEffect(() => {
    if (updateGuiAppMutation.isSuccess) {
      showNotification(
        `Application ${commonSetupValues.instanceName} edited successfully`,
        "success",
      );
      updateGuiAppMutation.reset();
      handleDone();
    }
  }, [updateGuiAppMutation.isSuccess]);

  // Render the view
  return (
    <Box sx={{ width: "100%" }}>
      {appConfigQuery.isPending && (
        <CircularProgress
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}

      <Typography variant="h6">Common App Setup</Typography>
      <AppSetupForm
        commonSetupValues={commonSetupValues}
        setCommonSetupValues={setCommonSetupValues}
      />

      <Typography variant="h6" sx={{ marginTop: 3 }}>
        App Specific Setup
      </Typography>
      <AppOptionsForm
        validationError={jsonValidationError}
        setValidationError={setJsonValidationError}
        appOptionsJsonString={appOptionsJsonString}
        setAppOptionsJsonString={setAppOptionsJsonString}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingTop: 2,
        }}
      >
        <Button color="inherit" onClick={handleDone} sx={{ marginRight: 1 }}>
          Close
        </Button>

        <Box>
          <DeleteWithConfirmationButton
            appInstanceId={appInstanceId}
            handleDone={handleDone}
          />
          <LoadingButton
            size="large"
            loading={updateGuiAppMutation.isPending}
            loadingPosition="start"
            startIcon={<SaveIcon />}
            variant="contained"
            onClick={() => {
              // Validate JSON input
              try {
                JSON.parse(appOptionsJsonString);
              } catch (error) {
                setJsonValidationError(`Invalid JSON format, error: ${error}`);
                return;
              }

              updateGuiAppMutation.mutate({
                instance_name: commonSetupValues.instanceName,
                description: commonSetupValues.description,
                path: commonSetupValues.path,
                options: JSON.parse(appOptionsJsonString),
              });
            }}
          >
            Save
          </LoadingButton>
        </Box>
      </Box>
    </Box>
  );
}
