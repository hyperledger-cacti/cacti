import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { AssetReference } from "../models/AssetReference";

const headCells = [
  {
    id: "id",
    first: true,
    label: "ID",
  },
  { id: "amount", numeric: true, label: "Amount" },
  {
    id: "owner",
    label: "Owner",
  },
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

export interface IAssetReferencesTableOptions {
  ledger: string;
  assetRefs: AssetReference[];
}

export default function AssetReferencesTable(props: IAssetReferencesTableOptions) {
  return (
    <div>
      {props.assetRefs && (
        <TableContainer>
          <Table size="small" aria-label="a dense table">
            <ItemsTableHead />
            <TableBody>
              {props.assetRefs.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.id}
                  </TableCell>
                  <TableCell align="center">{row.numberTokens}</TableCell>
                  <TableCell align="center">{row.recipient}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
