import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import AppsIcon from "@mui/icons-material/Apps";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { AppInstanceMenuEntry, AppListEntry } from "../../common/types/app";
import { patchAppRoutePath } from "../../common/utils";

type HeaderBarProps = {
  appList: AppListEntry[];
  path?: string;
  menuEntries?: AppInstanceMenuEntry[];
};

const HeaderBar: React.FC<HeaderBarProps> = ({ path, menuEntries }) => {
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
            component={RouterLink}
            to={"/"}
          >
            <AppsIcon />
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
    </AppBar>
  );
};

export default HeaderBar;
