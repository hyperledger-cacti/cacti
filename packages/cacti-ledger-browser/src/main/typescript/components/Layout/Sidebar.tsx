import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import TokenOutlinedIcon from "@mui/icons-material/TokenOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AppsIcon from "@mui/icons-material/Apps";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";

import { AppInstance } from "../../common/types/app";
import { patchAppRoutePath } from "../../common/utils";
import { NewAppDialog } from "../../pages/home/AddApplicationPopupCard";

export interface SidebarProps {
  appConfig: AppInstance[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Official Hyperledger Cacti brand mark illustration.
 * Multi-stem saguaro, prickly pear pads and flowering barrel cactus.
 */
export function CactiBrandLogo({
  height = 36,
  width,
}: {
  height?: number;
  width?: number;
}) {
  const calculatedWidth = width ?? Math.round(height * (247 / 298));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 300"
      width={calculatedWidth}
      height={height}
      style={{ display: "block", flexShrink: 0 }}
      aria-label="Hyperledger Cacti Logo"
    >
      <g>
        {/* Prickly pear cactus pads (lime & medium green) */}
        <path
          fill="#A8D04B"
          d="M113.2,237.4c-0.1-0.1-0.1-0.2-0.2-0.3c-2.8-3.9-6.4-7-10.4-9.1l2.7-5.7l0.6-1.3c0.8-1.6,0.1-3.5-1.5-4.2
          c-1.6-0.8-3.5-0.1-4.2,1.5l-0.8,1.6l-2.8,5.8c-2.8-0.8-5.7-1.3-8.6-1.3c-6.2,0-12.4,1.9-17.8,5.7c-13.7,9.8-16.9,28.9-7.1,42.7
          c0.2,0.3,0.4,0.6,0.7,0.9l-4.5,2.4c-0.4,0.2-0.7,0.5-1,0.8c-0.8,1-0.9,2.3-0.3,3.5c0.6,1.1,1.7,1.7,2.8,1.7c0.5,0,1-0.1,1.5-0.4
          l0.1,0l5.9-3.1c3.4,3.2,7.6,6.1,12.1,8.4l-0.2,7l0,0.9c0,1.8,1.4,3.2,3.1,3.2c0,0,0,0,0.1,0c1.3,0,2.3-0.7,2.9-1.8
          c0.2-0.4,0.3-0.8,0.3-1.3l0.1-5.3c4.4,1.6,8.8,2.5,13,2.5c1.9,0,3.7-0.2,5.4-0.6c3.7-1,7.4-2.6,10.3-6.9
          c-1.5-3.6-2.3-7.5-2.3-11.6V237.4z M73.5,262.5c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6
          C77.1,260.9,75.4,262.5,73.5,262.5z M91,243c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6c0,2-1.6,3.6-3.6,3.6
          C92.6,246.6,91,245,91,243z M98.2,273.3c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6
          C101.8,271.7,100.2,273.3,98.2,273.3z"
        />
        <path
          fill="#A8D04B"
          d="M72.8,158.2c-0.2-1.5-1.5-2.7-3-2.7c-1.2,0-2.3,0.7-2.9,1.7c-0.2,0.4-0.4,0.9-0.4,1.4l-0.2,4.9
          c-0.4,0-0.8-0.1-1.2-0.1c-1.9,0-3.9,0.3-5.9,0.8c-11.4,3.3-18,15.1-14.7,26.5c0.3,0.9,0.6,1.9,1.1,3l-6.5,0.7l-2.3,0.2
          c-1.7,0.2-3,1.8-2.8,3.5c0.2,1.6,1.6,2.8,3.2,2.8c0.1,0,0.2,0,0.3,0l4.4-0.5l6.9-0.7c5.1,8.3,13.5,18.1,21.2,23
          c5.1-2.9,10.8-4.6,16.8-4.8c1.2-3.8,1.8-8.5,1.9-13.5l6.4-1.3l0.4-0.1c1.7-0.3,2.8-2,2.5-3.7c-0.3-1.5-1.6-2.5-3.1-2.6
          c-0.2,0-0.4,0-0.7,0.1l-5.6,1.1c-0.4-7.5-1.5-14.7-2.8-19c-1.9-6.8-6.9-11.9-13.1-14.2l0.2-6.1C72.8,158.6,72.8,158.4,72.8,158.2z
          M75.8,206.3c0,2-1.6,3.6-3.6,3.6c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6C74.2,202.7,75.8,204.3,75.8,206.3z M73.5,180.8
          c0,2-1.6,3.6-3.6,3.6c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6C71.8,177.1,73.5,178.8,73.5,180.8z"
        />
        <path
          fill="#80C88D"
          d="M39.6,218.8c-2.9-1.3-5.9-1.9-8.9-1.9c-6.3,0-12.3,2.7-16.6,7.5l-4-4.8c0,0-0.1-0.1-0.1-0.1
          c-1.1-1.2-3-1.4-4.4-0.3c-1.4,1.1-1.5,3.1-0.4,4.5l0.9,1.1l4.4,5.3c0,0.1-0.1,0.1-0.1,0.2c-3.8,8.7-1.6,18.6,4.9,24.8l-4.6,4.4
          L9.9,260c-1.3,1.2-1.3,3.2-0.1,4.5c0.6,0.7,1.5,1,2.3,1c0.8,0,1.6-0.3,2.2-0.9l1.4-1.3l4.8-4.6c0.4,0.2,0.8,0.4,1.2,0.6
          c3.8,1.7,8.6,2.6,13.5,2.6c5.8,0,11.7-1.2,16.1-3.8c-0.3-3-0.2-6.1,0.3-9.2c0.8-4.7,2.4-9.1,4.8-13
          C53,228.4,46.1,221.6,39.6,218.8z M31.7,236c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6
          C35.3,234.4,33.7,236,31.7,236z M38.2,252.7c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6
          C41.8,251.1,40.2,252.7,38.2,252.7z"
        />
        <path
          fill="#80C88D"
          d="M15.5,161.6c0.7,0.3,1.6,0.3,2.4,0l1.3-0.5l6.6-2.6c2.1,1.7,4.6,3.1,7.3,4.2c3.3,1.3,6.9,2.2,10.2,2.3
          c3.5-4.1,8.1-7.2,13.3-8.8c2.2-7.8-1.6-18.9-7-24.6c-1.8-1.9-3.9-3.2-6.1-4.2c-2.1-0.8-4.3-1.2-6.4-1.3l0-5.9c0-0.2,0-0.3,0-0.5
          c-0.2-1.5-1.5-2.7-3.1-2.7c-1.8,0-3.2,1.4-3.2,3.2l0,0.3l0,6.6c-2.4,0.8-4.6,2.2-6.6,4c-6.2,6-7.1,15.3-2.9,22.3l-5.7,2.2
          c-0.1,0-0.2,0.1-0.3,0.2c-1.4,0.7-2.1,2.4-1.5,3.9C14,160.7,14.7,161.3,15.5,161.6z M37.2,140c0.8-1.8,2.9-2.7,4.7-2
          c1.8,0.8,2.7,2.9,2,4.7c-0.8,1.8-2.9,2.7-4.7,2C37.3,143.9,36.4,141.8,37.2,140z"
        />

        {/* Tall central Saguaro cactus with branches and white spine grooves */}
        <path
          fill="#80C88D"
          d="M214.5,111.3c-6.3,7.8-15.8,11.7-28.3,11.7c-1.1,0-2.2,0-3.4-0.1v12.5c0.5,0.1,0.9,0.1,1.4,0.1
          c1.2,0.1,2.4,0.1,3.6,0.1c0,0,0,0,0,0c20.4,0,31.7-8.8,37.6-16.1c16.8-20.9,9-52.4,8-56c-1.1-4.2-3.8-7.6-7.5-9.8
          c-2.2-1.3-4.7-2-7.1-2.1C221.6,61.8,228.7,93.6,214.5,111.3z"
        />
        <path
          fill="#80C88D"
          d="M182.9,117.1c12.4,0.7,21.5-2.5,27.1-9.5c12.8-15.8,5.4-46.8,3-55.3c-8.1,2.6-12.9,11.2-10.7,19.5
          c2,7.9,2.8,21.6-2,27.4c-2.4,3-7.3,4.3-14.5,4c-0.3,0-0.5,0-0.8,0c-0.7,0-1.4,0.1-2.1,0.2V117.1z"
        />
        <path
          fill="#80C88D"
          d="M113.2,149.1v-12.6c-6.6-2.2-22.1-9.7-26.6-31.6c-0.5-2.5-0.8-5-1-7.4c-0.4,0.8-0.9,1.6-1.6,2.3
          c-2.1,2.3-5.1,3.7-8.2,3.7c-0.8,0-1.6-0.1-2.4-0.3c1.5,15.5,8,25.5,13.8,31.5C95.4,143,105.2,147.1,113.2,149.1z"
        />
        <path
          fill="#80C88D"
          d="M93.4,77.4c-0.2,0.9-0.4,1.8-0.6,2.8c0.1,0.6,0.2,1.2,0.2,1.8c0,1.8-0.4,3.5-1.2,5c-0.6,5.3-0.6,11,0.6,16.8
          c3.5,17.2,14.7,24,20.9,26.6v-15.8c-1-0.7-2-1.5-2.9-2.4c-3.6-3.8-5.3-10-4.8-18.1C105.9,86.1,100.7,79.3,93.4,77.4z"
        />
        <path
          fill="#80C88D"
          d="M155,259.8V50.5c0-4.2-0.3-7.8-0.7-11.1c-0.8,0.2-1.6,0.3-2.5,0.3c-3.1,0-6.1-1.3-8.2-3.7
          c-1.6-1.7-2.5-3.9-2.7-6.2c-1.6,5.1-2.7,11.9-2.7,20.7v209.3c0,4.8,0.5,15.5,2.4,24.9c1.3,6.1,3,10.7,4.9,13.4h2
          c1.9-2.7,3.6-7.3,4.9-13.4C154.4,275.3,155,264.6,155,259.8z"
        />
        <path
          fill="#80C88D"
          d="M177.1,212.1V44.4c0-4.2-1.1-8.2-2.9-11.7c-0.5,1.2-1.1,2.3-2,3.3c-2.1,2.3-5.1,3.7-8.2,3.7
          c-1.3,0-2.6-0.2-3.8-0.7c0.4,3.5,0.7,7.3,0.7,11.5v209.3c0,3.4-0.2,25.6-6.4,38.2c9.3-0.8,17.1-6.7,20.7-14.9
          c-1.8-3.3-3.2-7.1-4.3-11.3c-3.7-14-3-30.9,2-47.6C173.9,220,175.4,216,177.1,212.1z"
        />
        <path
          fill="#80C88D"
          d="M138.6,297.5c-5.9-12.7-6.2-34.3-6.2-37.7V50.5c0-11.5,1.7-19.9,4.2-26.2c-0.7-1-1.2-2.1-1.5-3.3
          c-9.4,3.6-16.1,12.7-16.1,23.4V273C119,285,127.4,295,138.6,297.5z"
        />

        {/* Barrel cactus on the right (lime green) */}
        <path
          fill="#A8D04B"
          d="M186.5,288.8c-1.1-41.4,11.7-71,22.9-88.8c2.4-3.7,4.8-7.1,7.1-10.2c-3-2-4.9-5.3-4.9-9.1c0-0.2,0-0.3,0-0.5
          c-13.7,6.5-26.8,23.5-33.4,45.6C170.3,252.2,174.2,277.7,186.5,288.8z"
        />
        <path
          fill="#A8D04B"
          d="M230.3,220c1-6.5,1.6-12.7,1.9-18.3c-1.1,0.4-2.3,0.6-3.5,0.6c-3.1,0-6.1-1.3-8.2-3.7
          c-0.6-0.7-1.1-1.5-1.6-2.3c-1.6,2.2-3.2,4.5-4.8,7c-10.9,17.4-23.4,46.5-21.8,87.4C217.4,271.8,226.8,242.2,230.3,220z"
        />
        <path
          fill="#A8D04B"
          d="M246.7,246.3c5.2-17.2,5.3-34.1,1.4-46.8c-2,1.7-4.6,2.7-7.2,2.7c-1,0-1.9-0.1-2.8-0.4
          c-0.3,5.8-0.9,12.2-1.9,18.9c-5,32.2-18.4,57.5-38.9,73.6C215.6,297.9,237.5,277,246.7,246.3z"
        />

        {/* 3 Bloom Flowers (Warm Orange #F99F44) */}
        {/* Flower on top of barrel cactus */}
        <path
          fill="#F99F44"
          d="M220.5,176c-4.1,1.8-4.1,7.6,0,9.4c2.1,0.9,3.3,3,3,5.3c-0.4,3.3,2.3,5.7,5.1,5.7c1,0,2.1-0.3,3-1
          c0.9-0.7,2-1,3-1c1.1,0,2.1,0.3,3,1h0c1,0.7,2,1,3,1c2.9,0,5.5-2.4,5.1-5.7c-0.2-2.2,1-4.4,3-5.3c4.1-1.8,4.1-7.6,0-9.4
          c-2.1-0.9-3.3-3-3-5.3c0.4-3.3-2.3-5.7-5.1-5.7c-1,0-2.1,0.3-3,1h0c-0.9,0.7-2,1-3,1c-1.1,0-2.1-0.3-3-1c-1-0.7-2-1-3-1
          c-2.9,0-5.5,2.4-5.1,5.7C223.8,173,222.5,175.1,220.5,176z M234.7,184.4c-2,0-3.6-1.6-3.6-3.6c0-2,1.6-3.6,3.6-3.6
          c2,0,3.6,1.6,3.6,3.6C238.3,182.8,236.7,184.4,234.7,184.4z"
        />
        {/* Flower on left cactus arm */}
        <path
          fill="#F99F44"
          d="M72.9,96.7c1,0.7,2,1,3,1c2.9,0,5.5-2.4,5.1-5.7c-0.2-2.2,1-4.4,3-5.3h0c4.1-1.8,4.1-7.6,0-9.4h0
          c-2.1-0.9-3.3-3-3-5.3c0.4-3.3-2.3-5.7-5.1-5.7c-1,0-2.1,0.3-3,1c-0.9,0.7-2,1-3,1c-1.1,0-2.1-0.3-3-1c-1-0.7-2-1-3-1
          c-2.9,0-5.5,2.4-5.1,5.7c0.2,2.2-1,4.4-3,5.3h0c-4.1,1.8-4.1,7.6,0,9.4h0c2.1,0.9,3.3,3,3,5.3c-0.4,3.3,2.3,5.7,5.1,5.7
          c1,0,2.1-0.3,3-1c0.9-0.7,2-1,3-1C70.9,95.7,72,96,72.9,96.7z M66.2,82c0-2,1.6-3.6,3.6-3.6c2,0,3.6,1.6,3.6,3.6s-1.6,3.6-3.6,3.6
          C67.8,85.6,66.2,84,66.2,82z"
        />
        {/* Flower on apex of main saguaro */}
        <path
          fill="#F99F44"
          d="M143.6,22.8c2.1,0.9,3.3,3,3,5.3v0c-0.4,3.3,2.3,5.7,5.1,5.7c1,0,2.1-0.3,3-1c0.9-0.7,2-1,3-1s2.1,0.3,3,1
          c1,0.7,2,1,3,1c2.9,0,5.5-2.4,5.1-5.7v0c-0.2-2.2,1-4.4,3-5.3c4.1-1.8,4.1-7.6,0-9.4c-2.1-0.9-3.3-3-3-5.3
          c0.4-3.3-2.3-5.7-5.1-5.7c-1,0-2.1,0.3-3,1c-0.9,0.7-2,1-3,1s-2.1-0.3-3-1c-1-0.7-2-1-3-1c-2.9,0-5.5,2.4-5.1,5.7
          c0.2,2.2-1,4.4-3,5.3C139.5,15.2,139.5,21,143.6,22.8z M161.5,18.1c0,2-1.6,3.6-3.6,3.6c-2,0-3.6-1.6-3.6-3.6s1.6-3.6,3.6-3.6
          C159.8,14.5,161.5,16.1,161.5,18.1z"
        />
      </g>
    </svg>
  );
}

function getAppIcon(app: AppInstance) {
  const name = (app.appName + " " + app.instanceName + " " + app.path).toLowerCase();
  if (name.includes("satp") || name.includes("cross")) {
    return <CompareArrowsIcon fontSize="small" />;
  }
  if (name.includes("fabric")) {
    return <LayersOutlinedIcon fontSize="small" />;
  }
  if (name.includes("eth") || name.includes("token")) {
    return <TokenOutlinedIcon fontSize="small" />;
  }
  if (name.includes("tutorial")) {
    return <SchoolOutlinedIcon fontSize="small" />;
  }
  return <AppsIcon fontSize="small" />;
}

export default function Sidebar({
  appConfig,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Internal collapse state synchronized with localStorage
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cacti_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [newAppOpen, setNewAppOpen] = useState(false);

  const isCollapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("cacti_sidebar_collapsed", String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }
  };

  const isHomeActive = location.pathname === "/" || location.pathname === "";

  return (
    <>
      <Box
        component="aside"
        sx={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: isCollapsed ? 68 : 240,
          minWidth: isCollapsed ? 68 : 240,
          transition: "width 0.22s ease-in-out, min-width 0.22s ease-in-out",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          borderRight: "1px solid",
          borderColor: "#dfe5e3",
          zIndex: 1200,
          overflowX: "hidden",
          userSelect: "none",
        }}
      >
        {/* Top Brand Header */}
        <Box
          sx={{
            height: 64,
            display: "flex",
            alignItems: "center",
            px: isCollapsed ? 1.5 : 2,
            gap: 1.5,
            cursor: "pointer",
            borderBottom: "1px solid",
            borderColor: "transparent",
          }}
          onClick={() => navigate("/")}
        >
          <Tooltip title={isCollapsed ? "Hyperledger Cacti" : ""} placement="right">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: isCollapsed ? "100%" : "auto",
              }}
            >
              <CactiBrandLogo height={isCollapsed ? 34 : 38} />
            </Box>
          </Tooltip>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Barlow", sans-serif',
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: 1.15,
                  color: "#101314",
                  letterSpacing: "-0.2px",
                }}
              >
                Cacti
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#8d9a9d",
                  fontSize: 11,
                  fontWeight: 500,
                  display: "block",
                  letterSpacing: "0.2px",
                }}
              >
                Ledger Browser
              </Typography>
            </Box>
          )}
        </Box>

        {/* Connected Environment Widget (Headlamp "Clusters" context) */}
        {!isCollapsed ? (
          <Box
            sx={{
              mx: 1.5,
              mt: 1,
              mb: 1,
              p: 1.25,
              bgcolor: "#f7f9f6",
              borderRadius: "8px",
              border: "1px solid #dfe5e3",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <HubOutlinedIcon sx={{ color: "#4e8c5e", fontSize: 20 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#8d9a9d",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    lineHeight: 1.1,
                  }}
                >
                  Network Context
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#4e8c5e",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#101314",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Local Environment
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ my: 1, display: "flex", justifyContent: "center" }}>
            <Tooltip title="Connected: Local Environment" placement="right">
              <IconButton size="small" sx={{ color: "#4e8c5e" }}>
                <HubOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Main Navigation List */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: isCollapsed ? 1 : 1.5,
            py: 1,
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#dfe5e3",
              borderRadius: 4,
            },
          }}
        >
          <List disablePadding>
            {/* Overview / Home Page */}
            <Tooltip title={isCollapsed ? "Overview" : ""} placement="right">
              <ListItemButton
                component={RouterLink}
                to="/"
                sx={{
                  borderRadius: "8px",
                  mb: 0.5,
                  minHeight: 40,
                  px: isCollapsed ? 1.5 : 1.75,
                  bgcolor: isHomeActive ? "rgba(78, 140, 94, 0.12)" : "transparent",
                  color: isHomeActive ? "#2c5238" : "#3b4548",
                  "&:hover": {
                    bgcolor: isHomeActive
                      ? "rgba(78, 140, 94, 0.18)"
                      : "rgba(0, 0, 0, 0.04)",
                    color: "#101314",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 0 : 36,
                    color: isHomeActive ? "#4e8c5e" : "#8d9a9d",
                    justifyContent: "center",
                  }}
                >
                  <DashboardOutlinedIcon fontSize="small" />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary="Overview"
                    primaryTypographyProps={{
                      fontSize: 13,
                      fontWeight: isHomeActive ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>

            {/* Applications Section Header */}
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#8d9a9d",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  px: 1.5,
                  mt: 2,
                  mb: 0.75,
                }}
              >
                Applications
              </Typography>
            )}

            {/* List of Applications */}
            {appConfig.map((app) => {
              const isAppActive =
                location.pathname === app.path ||
                location.pathname.startsWith(app.path + "/");

              return (
                <Box key={app.id || app.path} sx={{ mb: 0.5 }}>
                  <Tooltip
                    title={isCollapsed ? app.instanceName : ""}
                    placement="right"
                  >
                    <ListItemButton
                      component={RouterLink}
                      to={app.path}
                      sx={{
                        borderRadius: "8px",
                        minHeight: 42,
                        px: isCollapsed ? 1.5 : 1.75,
                        // Headlamp-style active pill in Cacti Green
                        bgcolor: isAppActive ? "#4e8c5e" : "transparent",
                        color: isAppActive ? "#ffffff" : "#1c2224",
                        boxShadow: isAppActive
                          ? "0 2px 6px rgba(44, 82, 56, 0.25)"
                          : "none",
                        "&:hover": {
                          bgcolor: isAppActive ? "#2c5238" : "rgba(78, 140, 94, 0.08)",
                          color: isAppActive ? "#ffffff" : "#101314",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: isCollapsed ? 0 : 36,
                          color: isAppActive ? "#ffffff" : "#4e8c5e",
                          justifyContent: "center",
                        }}
                      >
                        {getAppIcon(app)}
                      </ListItemIcon>
                      {!isCollapsed && (
                        <ListItemText
                          primary={app.instanceName}
                          primaryTypographyProps={{
                            fontSize: 13,
                            fontWeight: isAppActive ? 700 : 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>

                  {/* Indented Sub-navigation items (Headlamp sub-items like AdmissionChecks) */}
                  {!isCollapsed && app.menuEntries && app.menuEntries.length > 0 && (
                    <Collapse in={isAppActive} timeout="auto" unmountOnExit>
                      <List disablePadding sx={{ pl: 2, mt: 0.5 }}>
                        {app.menuEntries.map((entry) => {
                          const resolvedPath = patchAppRoutePath(
                            app.path,
                            entry.url,
                          );

                          const isEntryActive =
                            entry.url === "/"
                              ? location.pathname === app.path ||
                                location.pathname === app.path + "/" ||
                                location.pathname.startsWith(app.path + "/session")
                              : location.pathname === resolvedPath ||
                                location.pathname.startsWith(resolvedPath + "/");

                          return (
                            <ListItemButton
                              key={entry.title}
                              component={RouterLink}
                              to={resolvedPath}
                              sx={{
                                minHeight: 34,
                                py: 0.5,
                                px: 1.5,
                                mb: 0.25,
                                borderRadius: "4px",
                                // Headlamp active sub-item indicator: vertical bar on the left
                                borderLeft: isEntryActive
                                  ? "3px solid #101314"
                                  : "3px solid transparent",
                                bgcolor: isEntryActive
                                  ? "rgba(0, 0, 0, 0.04)"
                                  : "transparent",
                                color: isEntryActive ? "#101314" : "#3b4548",
                                "&:hover": {
                                  bgcolor: isEntryActive
                                    ? "rgba(0, 0, 0, 0.06)"
                                    : "rgba(0, 0, 0, 0.03)",
                                  color: "#101314",
                                },
                              }}
                            >
                              <ListItemText
                                primary={entry.title}
                                primaryTypographyProps={{
                                  fontSize: 12.5,
                                  fontWeight: isEntryActive ? 600 : 400,
                                }}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </List>
        </Box>

        {/* Bottom Section: "+ Create" Button & Footer */}
        <Box sx={{ p: isCollapsed ? 1 : 1.5, pt: 1, borderTop: "1px solid #dfe5e3" }}>
          {/* Headlamp-style "+ Create" pill button */}
          {!isCollapsed ? (
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewAppOpen(true)}
              sx={{
                bgcolor: "#101314",
                color: "#ffffff",
                borderRadius: "20px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                py: 0.75,
                mb: 1.25,
                boxShadow: "0 2px 4px rgba(16, 19, 20, 0.15)",
                "&:hover": {
                  bgcolor: "#2c5238",
                  boxShadow: "0 4px 8px rgba(44, 82, 56, 0.25)",
                },
              }}
            >
              Create
            </Button>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <Tooltip title="Create Application" placement="right">
                <IconButton
                  onClick={() => setNewAppOpen(true)}
                  sx={{
                    bgcolor: "#101314",
                    color: "#ffffff",
                    "&:hover": { bgcolor: "#2c5238" },
                  }}
                  size="small"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Footer row: Version string + collapse toggle icon */}
          <Stack
            direction="row"
            justifyContent={isCollapsed ? "center" : "space-between"}
            alignItems="center"
          >
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  color: "#8d9a9d",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                }}
              >
                v3.0.1
              </Typography>
            )}
            <Tooltip
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              placement="right"
            >
              <IconButton
                size="small"
                onClick={handleToggle}
                sx={{
                  color: "#8d9a9d",
                  "&:hover": { color: "#101314" },
                }}
              >
                {isCollapsed ? (
                  <ChevronRightIcon fontSize="small" />
                ) : (
                  <ChevronLeftIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* Reused Add-Application Wizard Dialog */}
      <NewAppDialog open={newAppOpen} setOpen={setNewAppOpen} />
    </>
  );
}
