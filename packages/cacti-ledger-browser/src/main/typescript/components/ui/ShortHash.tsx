import Tooltip from "@mui/material/Tooltip";
import Typography, { TypographyProps } from "@mui/material/Typography";

const defaultMaxHashLength = 14;

type ShortHashProps = {
  hash: string;
  maxLength?: number;
} & TypographyProps;

/**
 * Wrapper around MUI Typography for displaying shortified hash when necessary.
 * Full hash will be shown in tooltip on hover.
 * @param hash hash to be displayed.
 * @param maxLength? maximum hash length (defualt is 14
 * @param TypographyProps? any additional props will be passed as Typography props
 *
 * @returns Short hash Typography with tooltip
 */
export default function ShortHash(params: ShortHashProps) {
  const { hash, maxLength: inputMaxLength, ...typographyParams } = params;
  const maxLength = inputMaxLength ? inputMaxLength : defaultMaxHashLength;

  if (hash.length <= maxLength) {
    return <Typography {...typographyParams}>{hash}</Typography>;
  }

  const shortHash = `...${hash.slice(-maxLength)}`;
  return (
    <Tooltip title={hash}>
      <Typography {...typographyParams}>{shortHash}</Typography>
    </Tooltip>
  );
}
