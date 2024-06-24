import Typography from "@mui/material/Typography";
import * as React from "react";

export interface PageTitleProps {
  children: React.ReactNode;
}

const PageTitle: React.FC<PageTitleProps> = ({ children }) => {
  return (
    <Typography
      variant="h4"
      component="h1"
      color="secondary"
      sx={{ marginBottom: 3, fontWeight: "bold" }}
    >
      {children}
    </Typography>
  );
};

export default PageTitle;
