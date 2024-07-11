import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";

import config from "../../common/config";
import { AppCategory } from "../../common/app-category";
import { addGuiAppConfig, invalidateGuiAppConfig } from "../../common/queries";
import { useNotification } from "../../common/context/NotificationContext";
import AppSpecificSetupView from "./AppSpecificSetupView";
import CommonSetupView from "./CommonSetupView";
import SelectAppView from "./SelectAppView";
import SelectGroupView from "./SelectGroupView";

const steps = [
  "Select Group",
  "Select App",
  "Common Setup",
  "App Specific Setup",
];

export interface AddNewAppProps {
  handleDone: () => void;
}

/**
 * Complex view with steps used to select and setup new GUI application.
 */
export default function AddNewApp({ handleDone }: AddNewAppProps) {
  const queryClient = useQueryClient();
  const addGuiAppMutation = useMutation({
    mutationFn: addGuiAppConfig,
    onSuccess: () => invalidateGuiAppConfig(queryClient),
  });
  const { showNotification } = useNotification();
  const [activeStep, setActiveStep] = React.useState(0);
  const [appCategory, setAppCategory] = React.useState<AppCategory | "">("");
  const [appId, setAppId] = React.useState("");
  const [commonSetupValues, setCommonSetupValues] = React.useState({
    instanceName: "",
    description: "",
    path: "",
  });
  const [appOptionsJsonString, setAppOptionsJsonString] = React.useState("");

  // Handle app creation error
  React.useEffect(() => {
    if (addGuiAppMutation.isError) {
      showNotification(
        `Could not fetch action endorsements: ${addGuiAppMutation.error}`,
        "error",
      );
      addGuiAppMutation.reset();
    }
  }, [addGuiAppMutation.isError]);

  // Handle app creation success
  React.useEffect(() => {
    if (addGuiAppMutation.isSuccess) {
      showNotification(
        `Application ${commonSetupValues.instanceName} added successfully`,
        "success",
      );
      addGuiAppMutation.reset();
      handleDone();
    }
  }, [addGuiAppMutation.isSuccess]);

  const handleNextStep = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Select current view in a steper
  let currentPage: JSX.Element | undefined;
  switch (activeStep) {
    case 0:
      currentPage = (
        <SelectGroupView
          handleCategorySelected={(category) => {
            setAppCategory(category);
            handleNextStep();
          }}
        />
      );
      break;
    case 1:
      currentPage = (
        <SelectAppView
          appCategory={appCategory}
          handleAppSelected={(appId) => {
            setAppId(appId);

            // Fetch setup defaults to be used in later views
            const appDefinition = config.get(appId);
            if (!appDefinition) {
              throw new Error(`Could not find App Definition with id ${appId}`);
            }
            setCommonSetupValues({
              instanceName: appDefinition.defaultInstanceName,
              description: appDefinition.defaultDescription,
              path: appDefinition.defaultPath,
            });
            setAppOptionsJsonString(
              JSON.stringify(appDefinition.defaultOptions, undefined, 2),
            );

            handleNextStep();
          }}
          handleBack={() => {
            setAppId("");
            setAppCategory("");
            handleBackStep();
          }}
        />
      );
      break;
    case 2:
      currentPage = (
        <CommonSetupView
          commonSetupValues={commonSetupValues}
          setCommonSetupValues={setCommonSetupValues}
          handleBack={handleBackStep}
          handleNext={handleNextStep}
        />
      );
      break;
    case 3:
      currentPage = (
        <AppSpecificSetupView
          appOptionsJsonString={appOptionsJsonString}
          setAppOptionsJsonString={setAppOptionsJsonString}
          handleBack={handleBackStep}
          isSending={addGuiAppMutation.isPending}
          handleSave={() => {
            addGuiAppMutation.mutate({
              app_id: appId,
              instance_name: commonSetupValues.instanceName,
              description: commonSetupValues.description,
              path: commonSetupValues.path,
              options: JSON.parse(appOptionsJsonString),
            });
          }}
        />
      );
      break;
  }

  // Render the stepper view
  return (
    <Box sx={{ width: "100%" }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => {
          return (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <Box sx={{ paddingTop: 3 }}>{currentPage}</Box>
    </Box>
  );
}
