import { styled } from "@mui/material/styles";
import Button, { ButtonProps } from "@mui/material/Button";

export const CriticalButton = styled(Button)<ButtonProps>(({}) => ({
  margin: "auto",
  width: "100%",
  fontSize: "13px",
  textTransform: "none",
  background: "#FF584B",
  color: "#FFFFFF",
  border: "0.5px solid #000000",
  "&:hover": {
    backgroundColor: "#444444",
    color: "#FFFFFF",
  },
  "&:disabled": {
    border: "0",
  },
}));
