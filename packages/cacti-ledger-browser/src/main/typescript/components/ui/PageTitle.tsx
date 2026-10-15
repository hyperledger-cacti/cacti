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
      color="text.primary"
      sx={{
        marginBottom: 3,
        fontWeight: 700,
        fontFamily: '"Barlow", Arial, sans-serif',
      }}
    >
      {children}
    </Typography>
  );
};

export default PageTitle;
