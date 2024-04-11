import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { AppConfigMenuEntry, AppListEntry } from "../../common/types/app";
import { patchAppRoutePath } from "../../common/utils";

type HeaderBarProps = {
  appList: AppListEntry[];
  path?: string;
  menuEntries?: AppConfigMenuEntry[];
};

const HeaderBar: React.FC<HeaderBarProps> = ({
  appList,
  path,
  menuEntries,
}) => {
  const [isAppSelectOpen, setIsAppSelectOpen] = React.useState(false);

  const AppSelectDrawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={() => setIsAppSelectOpen(false)}
    >
      <List>
        {appList.map((app) => (
          <ListItem key={app.name} disablePadding>
            <ListItemButton component={RouterLink} to={app.path}>
              <ListItemText primary={app.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" sx={{ paddingX: 2 }}>
      <Toolbar disableGutters>
        <Tooltip title="Select App">
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="select-application-button"
            sx={{ mr: 2 }}
            onClick={() => setIsAppSelectOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        {menuEntries && path && (
          <Box sx={{ flexGrow: 1, display: "flex" }}>
            {menuEntries.map((entry) => (
              <Button
                component={RouterLink}
                to={patchAppRoutePath(path, entry.url)}
                key={entry.title}
                sx={{ color: "inherit" }}
              >
                {entry.title}
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>

      <Drawer open={isAppSelectOpen} onClose={() => setIsAppSelectOpen(false)}>
        {AppSelectDrawer}
      </Drawer>
    </AppBar>
  );
};

export default HeaderBar;
