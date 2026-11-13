import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DnsIcon from "@mui/icons-material/Dns";

import SetupGuideLink from "../../../components/ui/SetupGuideLink";
import { SATP_APP_SETUP_GUIDE_URL } from "../hooks";

/**
 * Shown instead of the SATP pages while the instance knows no gateway. The
 * inspector does not probe any default host: nothing is requested until the
 * user adds a gateway here (or in the app options).
 */
export default function SatpGatewayOnboarding({
  onAddGateway,
}: {
  /** Opens the gateway manager (owned by the layout so it survives the first add). */
  onAddGateway: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ maxWidth: 720, mx: "auto", mt: 4 }}>
      <CardContent>
        <Stack spacing={2} alignItems="flex-start">
          <Stack direction="row" spacing={1} alignItems="center">
            <DnsIcon color="primary" />
            <Typography variant="h5" component="h2">
              Add your first SATP gateway
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            This inspector does not connect to anything until you add a gateway.
            Enter the OAPI (REST) URL of your SATP Hermes gateway, for example{" "}
            <code>http://localhost:4010</code>. For a cross-chain transfer, add
            the counterparty gateway as well, so both sides of each session can
            be compared.
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddGateway}
            >
              Add a gateway
            </Button>
            <Button onClick={() => navigate("guide")}>
              Open the in-app guide
            </Button>
            <SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
