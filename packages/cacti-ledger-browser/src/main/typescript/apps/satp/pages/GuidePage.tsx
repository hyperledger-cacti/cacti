import DownloadIcon from "@mui/icons-material/Download";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useQuery } from "@tanstack/react-query";
import React from "react";

import { useNotification } from "../../../common/context/NotificationContext";
import PageTitle from "../../../components/ui/PageTitle";
import { SATP_APP_SETUP_GUIDE_URL, useSatpOptions } from "../hooks";
import { satpHealthQuery } from "../queries";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Copyable multi-line shell command block. */
function CommandBlock({ command }: { command: string }) {
  const { showNotification } = useNotification();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      showNotification("Copied command to clipboard", "success");
    } catch (error) {
      showNotification(`Could not copy command: ${error}`, "error");
    }
  };

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={0.5}
      sx={{ width: "100%" }}
    >
      <Box
        component="pre"
        sx={{
          fontFamily: MONOSPACE,
          fontSize: 13,
          margin: 0,
          padding: 1.5,
          borderRadius: 1,
          bgcolor: "action.hover",
          overflowX: "auto",
          flex: 1,
          minWidth: 0,
        }}
      >
        {command}
      </Box>
      <IconButton size="small" aria-label="copy command" onClick={copy}>
        <ContentCopyIcon fontSize="inherit" />
      </IconButton>
    </Stack>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Chip size="small" color="primary" label={index} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ paddingLeft: 5.5 }}>
        {children}
      </Stack>
    </Stack>
  );
}

/**
 * Short in-app setup guide: live gateway status for the configured
 * instance plus the three commands/steps to get from nothing to a
 * populated sessions table. The docs page linked at the bottom carries
 * the full guide (deployment, security, trust model).
 */
export default function GuidePage() {
  const options = useSatpOptions();
  const { isPending, data } = useQuery(satpHealthQuery(options));
  const isReachable = data !== undefined;

  return (
    <Box>
      <PageTitle>Setup Guide</PageTitle>

      <Card variant="outlined" sx={{ marginBottom: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              This instance
            </Typography>
            {isPending ? (
              <Chip
                size="small"
                variant="outlined"
                color="info"
                label="checking gateway..."
              />
            ) : isReachable ? (
              <Chip size="small" color="success" label="gateway reachable" />
            ) : (
              <Chip
                size="small"
                color="warning"
                label="gateway unreachable — backing off"
              />
            )}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginTop: 1 }}
          >
            Gateway endpoint: <code>{options.gatewayUrl}</code>
            {options.prometheusUrl ? (
              <>
                {" · "}Prometheus: <code>{options.prometheusUrl}</code>
              </>
            ) : null}
            . Change them via the app card&apos;s configure dialog on the home
            page.
          </Typography>
        </CardContent>
      </Card>

      {!isPending && !isReachable && (
        <Alert severity="info" variant="outlined" sx={{ marginBottom: 3 }}>
          The gateway is not reachable yet — follow the steps below; the status
          above turns green as soon as the healthcheck answers.
        </Alert>
      )}

      <Stack spacing={3}>
        <Step index={1} title="Start a SATP Hermes gateway (with Prometheus)">
          <Typography variant="body2">
            From the repository root (first build takes a few minutes; the
            compose also starts Grafana on :3000 and Prometheus on :9090 — the
            gateway REST API is published on host port 3012):
          </Typography>
          <CommandBlock
            command={
              "docker compose --project-directory ./packages/cactus-plugin-satp-hermes \\\n" +
              "  -f ./packages/cactus-plugin-satp-hermes/docker-compose-satp.yml up -d --build"
            }
          />
          <Typography variant="body2">
            Verify (expect <code>{'{"status":"AVAILABLE"}'}</code>):
          </Typography>
          <CommandBlock
            command={
              "curl http://localhost:3012/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/healthcheck"
            }
          />
        </Step>

        <Step index={2} title="Point this app at the gateway">
          <Typography variant="body2">
            On the ledger browser home page, open this app card&apos;s configure
            dialog and set the gateway URL to <code>http://localhost:3012</code>{" "}
            (the compose publishes the gateway OAPI port 4010 on host 3012).
            Optionally set a Prometheus URL (<code>http://localhost:9090</code>)
            to light up the Overview metrics. Without a gateway URL the app
            still renders, in unreachable mode with polling backoff.
          </Typography>
        </Step>

        <Step index={3} title="Run transfers and watch them appear">
          <Typography variant="body2">
            Sessions appear as the gateway executes transfers. The dockerized
            integration suite runs real end-to-end transfers (spins Besu,
            Go-Ethereum and Postgres containers; budget 30–60 minutes):
          </Typography>
          <CommandBlock
            command={
              "corepack yarn workspace @hyperledger-cacti/cactus-plugin-satp-hermes \\\n" +
              "  test:integration:docker-local"
            }
          />
          <Typography variant="body2">
            The sessions table auto-refreshes (with backoff while the gateway is
            down); click a row for the audit timeline, proofs, transfer path and
            the JSON audit bundle export{" "}
            <DownloadIcon sx={{ fontSize: 14, verticalAlign: "middle" }} />.
          </Typography>
        </Step>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            href="https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/satp-inspector/"
            target="_blank"
            rel="noopener"
          >
            Full documentation
          </Button>
          <Button
            variant="text"
            size="small"
            href={SATP_APP_SETUP_GUIDE_URL}
            target="_blank"
            rel="noopener"
          >
            Setup reference
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
