import { Component, createSignal } from "solid-js";
import { BiRegularReset } from "solid-icons/bi";
// @ts-expect-error
import styles from "./Search.module.css";

const Search: Component<{
  type: string;
  onKeyUp: (value: string) => void;
  placeholder: string;
}> = (props) => {
  const [val, setValue] = createSignal<string>("");

  const handleInput = (e: InputEvent | ClipboardEvent) => {
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
    <div class={styles["input-wrapper"]}>
      <input
        class={styles["input"]}
        type={props.type}
        placeholder={props.placeholder}
        maxLength={32}
        value={val()}
        onInput={(e) => handleInput(e)}
        onPaste={(e) => handleInput(e)}
      />
      <button class={styles["input-reset"]} onClick={handleReset}>
        <i class={styles["input-reset-icon"]}>
          <BiRegularReset />
        </i>
      </button>
    </div>
  );
};

export default Search;
