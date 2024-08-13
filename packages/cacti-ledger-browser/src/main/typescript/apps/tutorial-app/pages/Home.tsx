import Box from "@mui/material/Box";
import PageTitle from "../../../components/ui/PageTitle";
import { useAppOptions } from "../hooks";

export default function Home() {
  const appOptions = useAppOptions();

  return (
    <Box>
      <PageTitle>Hello {appOptions.name}!</PageTitle>
    </Box>
  );
}
