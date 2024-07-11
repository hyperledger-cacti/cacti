import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import ListItemButton from "@mui/material/ListItemButton";
import config from "../../common/config";
import { AppCategory, getAppCategoryConfig } from "../../common/app-category";

export interface SelectGroupViewProps {
  handleCategorySelected: (category: AppCategory) => void;
}

/**
 * Add new app stepper view containing list of app categories to select.
 */
export default function SelectGroupView({
  handleCategorySelected,
}: SelectGroupViewProps) {
  const appCategories = Array.from(config.values()).map((app) => app.category);

  return (
    <>
      <Typography variant="h4">Select Group</Typography>

      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {Object.values(AppCategory).map((category) => {
          const categoryConfig = getAppCategoryConfig(category);
          const appCount = appCategories.filter(
            (appCat) => appCat === category,
          ).length;
          const categoryTitle = `${categoryConfig.name} (${appCount})`;

          return (
            <ListItemButton
              disabled={appCount === 0}
              onClick={() => handleCategorySelected(category)}
            >
              <ListItemAvatar>
                <Avatar>{categoryConfig.icon}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={categoryTitle}
                secondary={categoryConfig.description}
              />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}
