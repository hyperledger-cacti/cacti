import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { SessionReference } from "../models/SessionReference";

const headCells = [
  {
    id: "id",
    first: true,
    label: "ID",
  },
  { id: "status", label: "Status" },
  { id: "substatus", label: "Substatus" },
  { id: "origin", label: "Origin" },
  { id: "destination", label: "Destination" },
];

function ItemsTableHead() {
  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={"center"}
            style={
              headCell.first
                ? {
                    backgroundColor: "#EAEAEA",
                    color: "black",
                  }
                : {
                    backgroundColor: "#EAEAEA",
                    color: "black",
                  }
            }
          >
            {headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export interface ISessionReferencesTableOptions {
  ledger: string;
  sessionRefs: SessionReference[];
}

export default function SessionReferencesTable(
  props: ISessionReferencesTableOptions,
) {
  return (
    <div>
      {props.sessionRefs && (
        <TableContainer>
          <Table size="small" aria-label="a dense table">
            <ItemsTableHead />
            <TableBody>
              {props.sessionRefs.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  style={
                    row.status === "DONE"
                      ? { backgroundColor: "lightgreen" }
                      : { backgroundColor: "orange" }
                  }
                >
                  <TableCell component="th" scope="row">
                    {row.id}
                  </TableCell>
                  <TableCell align="center">{row.status}</TableCell>
                  <TableCell align="center">{row.substatus}</TableCell>
                  <TableCell align="center">{row.originLedger}</TableCell>
                  <TableCell align="center">{row.destinyLedger}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
