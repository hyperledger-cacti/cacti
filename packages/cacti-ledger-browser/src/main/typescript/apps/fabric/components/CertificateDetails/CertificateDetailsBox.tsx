import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { styled } from "@mui/material/styles";

import { FabricCertificate } from "../../supabase-types";
import StackedRowItems from "../../../../components/ui/StackedRowItems";

const ListHeaderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: "bold",
}));

const TextFieldDisabledBlackFont = styled(TextField)(() => ({
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "black",
  },
}));

function formatDateString(date: string | undefined) {
  if (date) {
    return new Date(date).toLocaleDateString();
  }

  return "-";
}

function formatCertificateAttr(attr: string | null | undefined) {
  if (attr) {
    return attr;
  }

  return "-";
}

function formatCertificateSubject(
  certificate: FabricCertificate,
  fieldPrefix: "issuer" | "subject",
) {
  return (
    <ul style={{ margin: 0 }}>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>Common Name:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_common_name`])}
          </Typography>
        </StackedRowItems>
      </li>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>Organization:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_org`])}
          </Typography>
        </StackedRowItems>
      </li>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>Organization Unit:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_org_unit`])}
          </Typography>
        </StackedRowItems>
      </li>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>Country:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_country`])}
          </Typography>
        </StackedRowItems>
      </li>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>Locality:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_locality`])}
          </Typography>
        </StackedRowItems>
      </li>
      <li>
        <StackedRowItems>
          <ListHeaderTypography>State:</ListHeaderTypography>
          <Typography>
            {formatCertificateAttr(certificate[`${fieldPrefix}_state`])}
          </Typography>
        </StackedRowItems>
      </li>
    </ul>
  );
}

export interface CertificateDetailsBoxProps {
  certificate: FabricCertificate | undefined;
}

/**
 * Detailed information of provided fabric certificate.
 * @param certificate: Fabric certificate from the DB.
 */
export default function CertificateDetailsBox({
  certificate,
}: CertificateDetailsBoxProps) {
  return (
    <Box>
      <StackedRowItems>
        <ListHeaderTypography>Serial Number:</ListHeaderTypography>
        <Typography>
          {formatCertificateAttr(certificate?.serial_number)}
        </Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Valid From:</ListHeaderTypography>
        <Typography>
          {formatCertificateAttr(formatDateString(certificate?.valid_from))}
        </Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Valid To:</ListHeaderTypography>
        <Typography>
          {formatCertificateAttr(formatDateString(certificate?.valid_to))}
        </Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Alt Name:</ListHeaderTypography>
        <Typography>
          {formatCertificateAttr(certificate?.subject_alt_name)}
        </Typography>
      </StackedRowItems>

      {certificate ? (
        <>
          <ListHeaderTypography marginTop={2}>Subject:</ListHeaderTypography>
          {formatCertificateSubject(certificate, "subject")}
        </>
      ) : (
        <StackedRowItems>
          <ListHeaderTypography>Subject:</ListHeaderTypography>
          <Typography>-</Typography>
        </StackedRowItems>
      )}

      {certificate ? (
        <>
          <ListHeaderTypography marginTop={2}>Issuer:</ListHeaderTypography>
          {formatCertificateSubject(certificate, "issuer")}
        </>
      ) : (
        <StackedRowItems>
          <ListHeaderTypography>Issuer:</ListHeaderTypography>
          <Typography>-</Typography>
        </StackedRowItems>
      )}

      <ListHeaderTypography marginTop={2}>
        Certificate (PEM):
      </ListHeaderTypography>
      <TextFieldDisabledBlackFont
        disabled
        fullWidth
        rows={5}
        multiline
        size="small"
        value={certificate?.pem ?? ""}
      />
    </Box>
  );
}
