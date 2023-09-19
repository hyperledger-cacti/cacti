import { Component } from "solid-js";

// @ts-ignore
import styles from "./EmptyTablePlaceholder.module.css";

const EmptyTablePlaceholder: Component = () => {
  return <div class={styles["placeholder-container"]}>No data available</div>;
};

export default EmptyTablePlaceholder;
