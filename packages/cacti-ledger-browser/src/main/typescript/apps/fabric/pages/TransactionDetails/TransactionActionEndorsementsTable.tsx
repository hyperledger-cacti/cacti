import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { fabricActionEndorsements } from "../../queries";
import { useNotification } from "../../../../common/context/NotificationContext";
import ShortenedTypography from "../../../../components/ui/ShortenedTypography";
import CertificateDialogButton from "../../components/CertificateDetails/CertificateDialogButton";

export interface TransactionActionEndorsementsTableProps {
  actionId: string;
}

/**
 * Table of transaction action endorsements.
 *
 * @warn Fetches the endorsements from a database - don't mount when not needed.
 *
 * @param actionId ID of an action in a database
 */
export default function TransactionActionEndorsementsTable({
  actionId,
}: TransactionActionEndorsementsTableProps) {
  const { showNotification } = useNotification();

  const { isError, data, error } = useQuery({
    ...fabricActionEndorsements(actionId),
  });
  const displayData = data ?? [];

  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch action endorsements: ${error}`,
        "error",
      );
  }, [isError]);

  return (
    <TableContainer component={Box}>
      <Table aria-label="action endorsements table">
        <TableHead>
          <TableRow>
            <TableCell>Signature </TableCell>
            <TableCell align="right">Msp ID</TableCell>
            <TableCell align="right">Identity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <ShortenedTypography maxWidth={400} text={row.signature} />
              </TableCell>
              <TableCell align="right">{row.mspid}</TableCell>
              <TableCell align="right">
                <CertificateDialogButton certId={row.certificate_id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
