import React, { useState } from "react";
import styles from "./Search.module.css";

function Search(props: any) {
  const [val, setValue] = useState<string>("");

  const handleInput = (e: InputEvent | ClipboardEvent | React.FormEvent<any>) => {
    const inputValue = (e.currentTarget as HTMLInputElement).value;
    if (inputValue) {
      setValue(inputValue);
      props.onKeyUp(inputValue);
    }
  };

  const handleReset = () => {
    setValue("");
    props.onKeyUp("");
  };

  return (
    <div className={styles["input-wrapper"]}>
      <input
        className={styles["input"]}
        type={props.type}
        placeholder={props.placeholder}
        maxLength={32}
        value={val}
        onInput={(e) => handleInput(e)}
        onPaste={(e) => handleInput(e)}
      />
      <button className={styles["input-reset"]} onClick={handleReset}>
        <i className={styles["input-reset-icon"]}>{/* <BiRegularReset /> */}</i>
      </button>
    </div>
  );
}

export default Search;
