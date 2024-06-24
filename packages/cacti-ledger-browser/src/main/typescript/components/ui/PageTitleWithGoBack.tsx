import * as React from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "./PageTitle";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export interface PageTitleWithGoBackProps {
  children: React.ReactNode;
}

const PageTitleWithGoBack: React.FC<PageTitleWithGoBackProps> = ({
  children,
}) => {
  const navigate = useNavigate();

  return (
    <Box display="flex" alignItems="center">
      <IconButton
        edge="start"
        color="primary"
        aria-label="go back"
        onClick={() => navigate(-1)}
        sx={{ marginBottom: 3 }}
      >
        <ArrowBackIcon sx={{ fontSize: 50 }} />
      </IconButton>
      <PageTitle>{children}</PageTitle>
    </Box>
  );
};

export default PageTitleWithGoBack;
