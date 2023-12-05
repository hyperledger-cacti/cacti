import { useEffect, useState } from "react";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import {
  bridgeOutTokensFabric,
  getAssetReferencesFabric,
} from "../../api-calls/fabric-api";
import { AssetReference } from "../../models/AssetReference";

export interface IBridgeOutDialogOptions {
  user: string;
  open: boolean;
  onClose: () => any;
}

export default function BridgeOutDialog(props: IBridgeOutDialogOptions) {
  const [assetRefs, setAssetRefs] = useState<AssetReference[]>([]);
  const [assetRefID, setAssetRefID] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      const list = await getAssetReferencesFabric(props.user);
      setAssetRefs(list.filter((asset: AssetReference) => asset.recipient === props.user));
    }

    if (props.open) {
      setSending(false);
      setAssetRefID("");
      fetchData();
    }
  }, [props.open, props.user]);

  const handleChangeAssetRefID = (event: SelectChangeEvent<string>) => {
    setAssetRefID(event.target.value);
  };

  const performBridgeOutTransaction = async () => {
    if (assetRefID === "") {
      setErrorMessage("Please choose a valid Asset Reference ID");
    } else {
      setSending(true);
      const assetRef = assetRefs.find(
        (asset) => asset.id === assetRefID,
      );
      if (assetRef === undefined) {
        setErrorMessage("Something went wrong. Asset Reference not found");
        return;
      }
      await bridgeOutTokensFabric(props.user, assetRef.numberTokens, assetRefID);
      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Bridge Out CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select the {props.user}"s Asset Reference that represents the amount
          to bridge out.
        </DialogContentText>
        {assetRefs.length === 0 ? (
          <Alert severity="error">
            Must escrow tokens before trying to bridge out CBDC.
          </Alert>
        ) : (
          <Select
            fullWidth
            name="assetRefID"
            value={assetRefID}
            variant="outlined"
            defaultValue={assetRefID}
            onChange={handleChangeAssetRefID}
          >
            {assetRefs.map((asset) => (
              <MenuItem key={asset.id} value={asset.id}>
                {asset.id}
              </MenuItem>
            ))}
          </Select>
        )}
        {errorMessage !== "" && <Alert severity="error">{errorMessage}</Alert>}
      </DialogContent>
      <DialogActions>
        {sending ? (
          <Button disabled>Sending...</Button>
        ) : (
          <div>
            <Button onClick={props.onClose}>Cancel</Button>
            <Button onClick={performBridgeOutTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
