import { useState } from "react";
import Button from "./Button";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import styles from "./Pagination.module.css";

type pagination = {
  current: number;
  total: number;
  goToPage: (pageNumber: number) => void;
  goNextPage: () => void;
  goPrevPage: () => void;
};

function Pagination(props: any) {
  let inputRef: any;
  const getInputValue = () =>
    inputRef?.value ? inputRef.value : props.current;
  const [goToPageVisible, setGoToPageVisible] = useState<boolean>(false);

  return (
    <div className={styles.pagination}>
      <Button onClick={() => props.goToPage(1)}>
        <KeyboardDoubleArrowLeftIcon />
      </Button>
      <Button onClick={() => props.goPrevPage()}>
        <KeyboardArrowLeftIcon />
      </Button>
      <Button onClick={() => setGoToPageVisible((prev) => !prev)}>
        {" "}
        <span>
          {props.current} / {props.total}
        </span>
      </Button>
      {goToPageVisible === true && (
        <div className={styles["pagination-jump"]}>
          <input
            ref={inputRef}
            id="number"
            type="number"
            min={1}
            max={props.total}
            placeholder={"Page"}
            disabled={inputRef?.value}
          />
          <Button onClick={() => props.goToPage(getInputValue())}>
            Go to page
          </Button>
        </div>
      )}
      <Button onClick={() => props.goNextPage()}>
        <KeyboardArrowRightIcon />
      </Button>
      <Button onClick={() => props.goToPage(props.total)}>
        <KeyboardDoubleArrowRightIcon />
      </Button>
    </div>
  );
}

export default Pagination;
