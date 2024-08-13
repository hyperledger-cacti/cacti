import * as React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

const pathCheckRegex = /^\/[a-zA-Z][a-zA-Z0-9]*$/;
const emptyFormHelperText = "Field can't be empty";
const regularPathHelperText =
  "Path under which the plugin will be available, must be unique withing GUI.";
const illformedPathHelperText = "Must be valid path (starting with '/')";

export interface CommonSetupFormValues {
  instanceName: string;
  description: string;
  path: string;
}

export interface AppSetupFormProps {
  commonSetupValues: CommonSetupFormValues;
  setCommonSetupValues: React.Dispatch<
    React.SetStateAction<CommonSetupFormValues>
  >;
}

/**
 * Form component for editing common app options.
 */
export default function AppSetupForm({
  commonSetupValues,
  setCommonSetupValues,
}: AppSetupFormProps) {
  const isInstanceNameEmptyError = !!!commonSetupValues.instanceName;
  const isDescriptionEmptyError = !!!commonSetupValues.description;
  const isPathEmptyError = !!!commonSetupValues.path;
  const isPathInvalidError = !pathCheckRegex.test(commonSetupValues.path);
  let pathHelperText = regularPathHelperText;
  if (isPathEmptyError) {
    pathHelperText = emptyFormHelperText;
  } else if (isPathInvalidError) {
    pathHelperText = illformedPathHelperText;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setCommonSetupValues({
      ...commonSetupValues,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Box
      component="form"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "50%",
        padding: 1,
        marginTop: 2,
      }}
    >
      <TextField
        label="Instance Name"
        name="instanceName"
        error={isInstanceNameEmptyError}
        helperText={isInstanceNameEmptyError ? emptyFormHelperText : ""}
        value={commonSetupValues.instanceName}
        onChange={handleChange}
      />
      <TextField
        label="Description"
        name="description"
        error={isDescriptionEmptyError}
        helperText={isDescriptionEmptyError ? emptyFormHelperText : ""}
        multiline
        maxRows={4}
        value={commonSetupValues.description}
        onChange={handleChange}
      />
      <TextField
        label="Path"
        name="path"
        error={isPathEmptyError || isPathInvalidError}
        helperText={pathHelperText}
        value={commonSetupValues.path}
        onChange={handleChange}
      />
    </Box>
  );
}
