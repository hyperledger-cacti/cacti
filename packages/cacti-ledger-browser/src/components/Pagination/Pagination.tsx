import Button from "../UI/Button/Button";
import {
  FaSolidAngleRight,
  FaSolidAngleLeft,
  FaSolidAnglesLeft,
  FaSolidAnglesRight,
} from "solid-icons/fa";
import { Component, createSignal } from "solid-js";
// @ts-expect-error
import styles from "./Pagination.module.css";

type pagination = {
  current: number;
  total: number;
  goToPage: (pageNumber: number) => void;
  goNextPage: () => void;
  goPrevPage: () => void;
};

const Pagination: Component<pagination> = (props) => {
  let inputRef: any;
  const getInputValue = () =>
    inputRef?.value ? inputRef.value : props.current;
  const [goToPageVisible, setGoToPageVisible] = createSignal<boolean>(false);

  return (
    <div class={styles.pagination}>
      <Button onClick={() => props.goToPage(1)}>
        <FaSolidAnglesLeft />
      </Button>
      <Button onClick={() => props.goPrevPage()}>
        <FaSolidAngleLeft />
      </Button>
      <Button onClick={() => setGoToPageVisible((prev) => !prev)}>
        {" "}
        <span>
          {props.current} / {props.total}
        </span>
      </Button>
      {goToPageVisible() === true && (
        <div class={styles["pagination-jump"]}>
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
        <FaSolidAngleRight />
      </Button>
      <Button onClick={() => props.goToPage(props.total)}>
        <FaSolidAnglesRight />
      </Button>
    </div>
  );
};

export default Pagination;
