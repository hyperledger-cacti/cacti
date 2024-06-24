import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";

const actionButtonFontSize = 30;

/**
 * Pagination footer component interface.
 */
export interface UITableListingPaginationActionProps {
  page: number;
  disableNext: boolean;
  onPageChange: (newPage: number) => void;
  onPageRefresh: () => void;
}

/**
 * Pagination footer component to be used with `UITableListing`.
 */
const UITableListingPaginationAction: React.FC<
  UITableListingPaginationActionProps
> = ({ page, disableNext, onPageChange, onPageRefresh }) => {
  const homeButton =
    page === 0 ? (
      <IconButton size="large" onClick={onPageRefresh} aria-label="refresh">
        <RefreshIcon sx={{ fontSize: actionButtonFontSize }} />
      </IconButton>
    ) : (
      <IconButton
        size="large"
        onClick={() => {
          onPageChange(0);
        }}
        aria-label="first page"
      >
        <FirstPageIcon sx={{ fontSize: actionButtonFontSize }} />
      </IconButton>
    );

  return (
    <Box display={"flex"}>
      {homeButton}
      <Box flexGrow={2}></Box>
      <IconButton
        size="large"
        onClick={() => {
          onPageChange(page - 1);
        }}
        disabled={page === 0}
        aria-label="previous page"
      >
        <KeyboardArrowLeft sx={{ fontSize: actionButtonFontSize }} />
      </IconButton>
      <IconButton
        size="large"
        onClick={() => {
          onPageChange(page + 1);
        }}
        aria-label="next page"
        disabled={disableNext}
      >
        <KeyboardArrowRight sx={{ fontSize: actionButtonFontSize }} />
      </IconButton>
    </Box>
  );
};

export default UITableListingPaginationAction;
