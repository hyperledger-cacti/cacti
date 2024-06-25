import Link, { LinkProps } from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";

const defaultMaxWidth = 200;

export type ShortenedLinkProps = {
  href: string;
  maxWidth?: number | string;
  direction?: "ltr" | "rtl";
} & LinkProps;

/**
 * Wrapper around MUI Link for displaying shortified link when necessary.
 * Full URL will be shown in tooltip on hover.
 * Accepts all regular Typography props. Does not accept children element (displays the URL).
 *
 * @todo Use common code with ShortenedTypography.
 *
 * @param href Link to shortify.
 * @param maxWidth Maximum with of the text to display before the shortening.
 * @param width Same as `maxWidth` (overwrites it).
 * @param direction `ltr` (default) will display the beginning of the link, `rtl` will display the ending.
 */
export default function ShortenedLink(params: ShortenedLinkProps) {
  const { href, maxWidth: inputMaxWidth, direction, ...linkParams } = params;
  const maxWidth = inputMaxWidth ? inputMaxWidth : defaultMaxWidth;

  return (
    <Tooltip title={href}>
      <Link
        width={maxWidth}
        {...linkParams}
        href={href}
        sx={{
          whiteSpace: "nowrap",
          overflow: "hidden!important",
          textOverflow: "ellipsis",
          direction,
        }}
      >
        {href}
      </Link>
    </Tooltip>
  );
}
