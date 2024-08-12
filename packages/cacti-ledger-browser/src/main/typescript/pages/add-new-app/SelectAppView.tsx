import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import ListItemButton from "@mui/material/ListItemButton";

import config from "../../common/config";
import { AppCategory, getAppCategoryConfig } from "../../common/app-category";

export interface SelectAppViewProps {
  appCategory: string;
  handleAppSelected: (appId: string) => void;
  handleBack: () => void;
}

/**
 * Add new app stepper view containing list of app under given category to pick.
 */
export default function SelectAppView({
  appCategory,
  handleAppSelected,
  handleBack,
}: SelectAppViewProps) {
  const apps = Array.from(config).filter(
    (app) => app[1].category === appCategory,
  );
  const categoryConfig = getAppCategoryConfig(appCategory as AppCategory);

  return (
    <>
      <Typography variant="h4">Select Application</Typography>

      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {apps.map(([appId, app]) => {
          return (
            <ListItemButton onClick={() => handleAppSelected(appId)}>
              <ListItemAvatar>
                <Avatar>{categoryConfig.icon}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={app.appName}
                secondary={app.defaultDescription}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ display: "flex", flexDirection: "row", paddingTop: 2 }}>
        <Button color="inherit" onClick={handleBack} sx={{ marginRight: 1 }}>
          Back
        </Button>
      </Box>
    </>
  );
}
