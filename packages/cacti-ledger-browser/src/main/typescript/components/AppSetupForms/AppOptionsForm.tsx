import * as React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

export interface AppOptionsFormProps {
  validationError: string;
  setValidationError: React.Dispatch<React.SetStateAction<string>>;
  appOptionsJsonString: string;
  setAppOptionsJsonString: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Form component for editing app options (app specific settings)
 */
export default function AppOptionsForm({
  validationError,
  setValidationError,
  appOptionsJsonString,
  setAppOptionsJsonString,
}: AppOptionsFormProps) {
  return (
    <Box
      component="form"
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: 1,
        marginTop: 2,
      }}
    >
      <TextField
        label="Application Options JSON"
        name="options"
        multiline
        maxRows={30}
        error={!!validationError}
        helperText={validationError}
        value={appOptionsJsonString}
        onChange={(e) => {
          setValidationError("");
          setAppOptionsJsonString(e.target.value);
        }}
      />
    </Box>
  );
}
