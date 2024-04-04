import styles from "./EmptyTablePlaceholder.module.css";

function EmptyTablePlaceholder() {
  return (
    <div className={styles["placeholder-container"]}>No data available</div>
  );
}

export default EmptyTablePlaceholder;
