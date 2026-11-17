import React from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";

const ContentLayout: React.FC = () => {
  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3 },
        width: "100%",
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      <Outlet />
    </Box>
  );
};

export default ContentLayout;
