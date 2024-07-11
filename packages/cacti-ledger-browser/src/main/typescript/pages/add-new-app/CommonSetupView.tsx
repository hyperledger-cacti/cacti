import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AppSetupForm from "../../components/AppSetupForms/AppSetupForm";

export interface CommonSetupFormValues {
  instanceName: string;
  description: string;
  path: string;
}

export interface CommonSetupViewProps {
  commonSetupValues: CommonSetupFormValues;
  setCommonSetupValues: React.Dispatch<
    React.SetStateAction<CommonSetupFormValues>
  >;
  handleBack: () => void;
  handleNext: () => void;
}

/**
 * Add new app stepper view containing common application configuration (required by all apps).
 */
export default function CommonSetupView({
  commonSetupValues,
  setCommonSetupValues,
  handleBack,
  handleNext,
}: CommonSetupViewProps) {
  return (
    <>
      <Typography variant="h4">Common App Setup</Typography>
      <AppSetupForm
        commonSetupValues={commonSetupValues}
        setCommonSetupValues={setCommonSetupValues}
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
        <Button variant="outlined" onClick={handleNext}>
          Next
        </Button>
      </Box>
    </>
  );
}
