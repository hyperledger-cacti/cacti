import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import AppOptionsForm from "../../components/AppSetupForms/AppOptionsForm";

export interface AppSpecificSetupViewProps {
  appOptionsJsonString: string;
  setAppOptionsJsonString: React.Dispatch<React.SetStateAction<string>>;
  handleBack: () => void;
  handleSave: () => void;
  isSending: boolean;
}

/**
 * Add new app stepper view containing application specific configuration (in form of a JSON to be filled by the user)
 */
export default function AppSpecificSetupView({
  appOptionsJsonString,
  setAppOptionsJsonString,
  handleBack,
  handleSave,
  isSending,
}: AppSpecificSetupViewProps) {
  const [validationError, setValidationError] = React.useState("");

  return (
    <>
      <Typography variant="h4">App Specific Setup</Typography>
      <AppOptionsForm
        validationError={validationError}
        setValidationError={setValidationError}
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
        <Button color="inherit" onClick={handleBack} sx={{ marginRight: 1 }}>
          Back
        </Button>
        <LoadingButton
          size="large"
          loading={isSending}
          loadingPosition="start"
          startIcon={<SaveIcon />}
          variant="contained"
          onClick={() => {
            // Validate JSON input
            try {
              JSON.parse(appOptionsJsonString);
            } catch (error) {
              setValidationError(`Invalid JSON format, error: ${error}`);
              return;
            }

            handleSave();
          }}
        >
          Save
        </LoadingButton>
      </Box>
    </>
  );
}
