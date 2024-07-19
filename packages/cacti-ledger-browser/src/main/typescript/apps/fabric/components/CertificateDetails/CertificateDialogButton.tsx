import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

import CertificateDetailsBox from "./CertificateDetailsBox";
import { fabricCertificate } from "../../queries";
import { useNotification } from "../../../../common/context/NotificationContext";

export interface CertificateDialogButtonProps {
  certId: string | null;
}

/**
 * Show a button with certificate common name and organization, that will
 * open a dialog with full certificate details on click.
 *
 * @warn Fetches the certificate from DB when mounted.
 *
 * @param certId ID of the certificate in database.
 */
export default function CertificateDialogButton({
  certId,
}: CertificateDialogButtonProps) {
  const { showNotification } = useNotification();
  const [openDialog, setOpenDialog] = React.useState(false);

  const { isError, data, error } = useQuery({
    ...fabricCertificate(certId ?? ""),
    enabled: !!certId,
  });

  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch creator certificate: ${error}`,
        "error",
      );
  }, [isError]);

  let creatorName = "unknownName";
  if (data?.subject_common_name) {
    creatorName = data.subject_common_name;
  }

  let creatorOrg = "unknownOrg";
  if (data?.subject_org) {
    creatorOrg = data.subject_org;
  } else if (data?.subject_org_unit) {
    creatorOrg = data.subject_org_unit;
  }

  return (
    <>
      <Button
        disabled={!data}
        style={{ textTransform: "none" }}
        variant="outlined"
        onClick={() => setOpenDialog(true)}
      >
        {creatorName}@{creatorOrg}
      </Button>
      <Dialog onClose={() => setOpenDialog(false)} open={openDialog}>
        <DialogTitle color="primary">Certificate Details</DialogTitle>
        <DialogContent>
          <CertificateDetailsBox certificate={data} />
        </DialogContent>
      </Dialog>
    </>
  );
}
