import { Card } from "@mui/material";
import { Outlet } from "react-router-dom";

const ContentLayout: React.FC = () => {
  return (
    <Card elevation={0} sx={{ margin: "1rem", padding: "1rem" }}>
      <Outlet />
    </Card>
  );
};

export default ContentLayout;
