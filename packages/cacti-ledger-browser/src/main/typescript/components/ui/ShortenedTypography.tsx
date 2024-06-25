import Tooltip from "@mui/material/Tooltip";
import Typography, { TypographyProps } from "@mui/material/Typography";

const defaultMaxWidth = 200;

export type ShortenedTypographyProps = {
  text: string;
  maxWidth?: number | string;
  direction?: "ltr" | "rtl";
} & TypographyProps;

/**
 * Wrapper around MUI Typography for displaying shortified text when necessary.
 * Full text will be shown in tooltip on hover.
 * Accepts all regular Typography props. Does not accept children element (text is displayed in a tooltip)
 *
 * @param text Text to shortify.
 * @param maxWidth Maximum with of the text to display before the shortening.
 * @param width Same as `maxWidth` (overwrites it).
 * @param direction `ltr` (default) will display the beginning of the text, `rtl` will display the ending.
 */
export default function ShortenedTypography(params: ShortenedTypographyProps) {
  const {
    text,
    maxWidth: inputMaxWidth,
    direction,
    ...typographyParams
  } = params;
  const maxWidth = inputMaxWidth ? inputMaxWidth : defaultMaxWidth;

  return (
    <Tooltip title={text}>
      <Typography
        width={maxWidth}
        {...typographyParams}
        sx={{
          whiteSpace: "nowrap",
          overflow: "hidden!important",
          textOverflow: "ellipsis",
          direction,
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
}
