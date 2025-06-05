import { styled } from "@mui/material/styles";
import Button, { ButtonProps } from "@mui/material/Button";

export const NormalButton = styled(Button)<ButtonProps>(({}) => ({
  margin: "auto",
  width: "100%",
  fontSize: "13px",
  textTransform: "none",
  background: "#2B9BF6",
  color: "#FFFFFF",
  border: "0.5px solid #000000",
  "&:disabled": {
    border: "0",
  },
}));
