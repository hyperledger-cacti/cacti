import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { SessionReference } from "../models/SessionReference";

const headCells = [
  {
    id: "User",
    first: true,
    label: "User",
  },
  { id: "Amount", label: "Amount" },
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

export interface IApprovalsTableOptions {
  ledger: string;
  sessionRefs: SessionReference[];
  aliceApprovals: number;
  charlieApprovals: number;
}

export default function ApprovalsTable(props: IApprovalsTableOptions) {
  return (
    <TableContainer>
      <Table size="small" aria-label="a dense table">
        <ItemsTableHead />
        <TableBody>
          <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
            <TableCell align="center" component="th" scope="row">
              Alice
            </TableCell>
            <TableCell align="center">{props.aliceApprovals}</TableCell>
          </TableRow>
          <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
            <TableCell align="center" component="th" scope="row">
              Charlie
            </TableCell>
            <TableCell align="center">{props.charlieApprovals}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
