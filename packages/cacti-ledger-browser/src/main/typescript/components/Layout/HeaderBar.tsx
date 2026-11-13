import { useState, useEffect, useRef } from "react";
import { alpha, type Theme } from "@mui/material/styles";
import SettingsDialog from "../Settings/SettingsDialog";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import InputBase from "@mui/material/InputBase";
import Chip from "@mui/material/Chip";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { AppInstanceMenuEntry } from "../../common/types/app";
import { isValidUrl } from "../../common/utils";

export type HeaderBarProps = {
  path?: string;
  menuEntries?: AppInstanceMenuEntry[];
  appDocumentationURL?: string;
  appName?: string;
};

export default function HeaderBar({
  path,
  menuEntries,
  appDocumentationURL,
  appName,
}: HeaderBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Shortcut key listener: pressing "/" focuses the search bar (Headlamp pattern)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Determine breadcrumb label
  const isHome = location.pathname === "/" || location.pathname === "";
  const canGoBack =
    location.pathname.includes("/session/") ||
    location.pathname.split("/").filter(Boolean).length > 2;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
        zIndex: 1100,
        height: 56,
        justifyContent: "center",
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "56px !important",
          px: { xs: 2, sm: 3 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        {/* Left: Breadcrumbs / Back button */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 160 }}
        >
          {canGoBack && (
            <Tooltip title="Go back">
              <IconButton
                size="small"
                onClick={() => navigate(-1)}
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isHome ? "primary.main" : "text.disabled",
                fontSize: 13,
              }}
            >
              {isHome ? "Overview" : appName || "Applications"}
            </Typography>
            {!isHome && (
              <>
                <Typography variant="caption" sx={{ color: "divider" }}>
                  /
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "text.primary",
                    fontSize: 13,
                  }}
                >
                  {(() => {
                    if (location.pathname.includes("/session/")) {
                      return "Session Detail";
                    }
                    const activeEntry = menuEntries?.find((entry) => {
                      if (entry.url === "/") {
                        return (
                          location.pathname === path ||
                          location.pathname === path + "/"
                        );
                      }
                      return location.pathname.includes(entry.url);
                    });
                    return activeEntry ? activeEntry.title : "Inspector";
                  })()}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Center: Headlamp-Style Search Bar */}
        <Box
          sx={{
            flex: "0 1 440px",
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            bgcolor: "background.default",
            borderRadius: "20px",
            border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
            px: 1.5,
            py: 0.25,
            transition: "all 0.15s ease",
            "&:focus-within": {
              borderColor: "primary.light",
              bgcolor: "background.paper",
              boxShadow: (theme: Theme) =>
                `0 0 0 2px ${alpha(theme.palette.primary.light, 0.25)}`,
            },
          }}
        >
          <SearchIcon sx={{ color: "text.disabled", fontSize: 18, mr: 1 }} />
          <InputBase
            inputRef={searchInputRef}
            placeholder="Search sessions, gateways, ledgers..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{
              flex: 1,
              fontSize: 13,
              color: "text.primary",
              "& input::placeholder": {
                color: "text.disabled",
                opacity: 1,
              },
            }}
          />
          {searchValue ? (
            <IconButton
              size="small"
              onClick={() => setSearchValue("")}
              sx={{ p: 0.25 }}
            >
              <ClearIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            </IconButton>
          ) : (
            <Chip
              label="Press / to search"
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: 10,
                color: "text.disabled",
                borderColor: "divider",
                bgcolor: "background.paper",
                borderRadius: "4px",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>

        {/* Right: Actions (Documentation / Settings) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {isValidUrl(appDocumentationURL) && (
            <Tooltip title="Documentation">
              <IconButton
                size="small"
                onClick={() => window.open(appDocumentationURL, "_blank")}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "primary.main",
                    bgcolor: (theme: Theme) =>
                      `${alpha(theme.palette.primary.main, 0.08)}`,
                  },
                }}
                aria-label="app-documentation-link"
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Settings">
            <IconButton
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
              }}
              aria-label="settings-button"
              aria-haspopup="dialog"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
