import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Buffer } from "buffer";
import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import Stack from "@mui/material/Stack";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import { fabricTransactionActions } from "../../queries";
import { FabricTransactionAction } from "../../supabase-types";
import {
  StyledTableCellHeader,
  StyledTableCell,
} from "../../../../components/ui/UITableListing/StyledTableCell";
import CertificateDialogButton from "../../components/CertificateDetails/CertificateDialogButton";
import TransactionActionEndorsementsTable from "./TransactionActionEndorsementsTable";
import { useNotification } from "../../../../common/context/NotificationContext";

const TextFieldDisabledBlackFont = styled(TextField)(() => ({
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "black",
  },
}));

interface ExpandableActionRowProps {
  row: FabricTransactionAction;
}

/**
 * Single action row that can be expanded to show more details.
 *
 * @param row action row from a database
 */
function ExpandableActionRow({ row }: ExpandableActionRowProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [showFunctionArgs, setShowFunctionArgs] = React.useState(true);
  const [showActionCreator, setShowActionCreator] = React.useState(false);
  const [showActionEndorsements, setShowActionEndorsements] =
    React.useState(false);

  const functionArgs = (row.function_args ?? "").split(",").filter((a) => !!a);
  const decodedFunctionArgs = functionArgs.map((a) =>
    Buffer.from(a.substring(2), "hex").toString("utf-8"),
  );

  return (
    <React.Fragment>
      {/* Basic row entry */}
      <TableRow
        sx={{
          "& > *": { borderBottom: "unset" },
        }}
      >
        <StyledTableCell
          component="th"
          scope="row"
          sx={{
            fontWeight: "bold",
            color: theme.palette.secondary.main,
          }}
        >
          {row.function_name}
        </StyledTableCell>
        <StyledTableCell align="right">
          {decodedFunctionArgs.length}
        </StyledTableCell>
        <StyledTableCell align="right">{row.chaincode_id}</StyledTableCell>
        <StyledTableCell align="right">{row.creator_msp_id}</StyledTableCell>
        <StyledTableCell align="right">
          <IconButton
            aria-label="expand action details"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </StyledTableCell>
      </TableRow>

      {/* Expanded row details */}
      <TableRow>
        {/* Green strip on the left */}
        <TableCell
          style={{
            padding: 0,
            paddingLeft: 30,
            backgroundColor: theme.palette.primary.light,
          }}
          colSpan={6}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ padding: 1, paddingLeft: 2, backgroundColor: "white" }}>
              {/* Function Args */}
              <Box>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight="bold">
                    Function Args
                  </Typography>
                  <IconButton
                    aria-label="expand function args"
                    size="small"
                    onClick={() => setShowFunctionArgs(!showFunctionArgs)}
                  >
                    {showFunctionArgs ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>
                </Stack>
                {showFunctionArgs ? (
                  <ol>
                    {decodedFunctionArgs.map((a) => (
                      <li key={a} style={{ margin: 10 }}>
                        <TextFieldDisabledBlackFont
                          disabled
                          fullWidth
                          maxRows={7}
                          multiline
                          size="small"
                          value={a}
                        />
                      </li>
                    ))}
                  </ol>
                ) : undefined}
              </Box>

              {/* Creator */}
              <Box marginTop={2}>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight="bold">
                    Creator ({row.creator_msp_id})
                  </Typography>
                  <IconButton
                    aria-label="expand creator certificate details"
                    size="small"
                    onClick={() => setShowActionCreator(!showActionCreator)}
                  >
                    {showActionCreator ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>
                </Stack>
                {showActionCreator ? (
                  <CertificateDialogButton
                    certId={row.creator_certificate_id}
                  />
                ) : undefined}
              </Box>

              {/* Endorsements */}
              <Box marginTop={2}>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight="bold">
                    Endorsements
                  </Typography>
                  <IconButton
                    aria-label="expand endorsements list"
                    size="small"
                    onClick={() =>
                      setShowActionEndorsements(!showActionEndorsements)
                    }
                  >
                    {showActionEndorsements ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>
                </Stack>
                {showActionEndorsements ? (
                  <TransactionActionEndorsementsTable actionId={row.id} />
                ) : undefined}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export interface TransactionActionsTableProps {
  txId?: string;
}

/**
 * Table with actions of the specified transaction.
 * Fetches the needed data from a database.
 *
 * @param txId transaction id in the database (not hash!)
 */
export default function TransactionActionsTable({
  txId,
}: TransactionActionsTableProps) {
  const { showNotification } = useNotification();

  const { isError, data, error } = useQuery({
    ...fabricTransactionActions(txId ?? ""),
    enabled: !!txId,
  });
  const displayData = data ?? [];

  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch transaction actions: ${error}`,
        "error",
      );
  }, [isError]);

  return (
    <TableContainer component={Paper}>
      <Table aria-label="transaction actions">
        <TableHead>
          <TableRow>
            <StyledTableCellHeader>Function Name</StyledTableCellHeader>
            <StyledTableCellHeader align="right">
              Args Count
            </StyledTableCellHeader>
            <StyledTableCellHeader align="right">
              Chaincode ID
            </StyledTableCellHeader>
            <StyledTableCellHeader align="right">
              Creator MSP ID
            </StyledTableCellHeader>
            <StyledTableCellHeader align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {displayData.map((row) => (
            <ExpandableActionRow key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
