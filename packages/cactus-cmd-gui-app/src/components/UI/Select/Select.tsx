import { For, Component, createSignal } from "solid-js";
import { useLocation } from "@solidjs/router";

// @ts-ignore
import styles from "./Select.module.css";

const options = [
  { value: "", display: "Select the ledger" },
  { value: "eth", display: "Ethereum" },
  { value: "fabric", display: "Fabric" },
];

const Select: Component<{
  onSelect: (selectedOption: string) => void;
  value: string;
}> = (props) => {
  const selectStartLedgerByUrl = (path: string) =>
    options.find((option) => option.value === path);

  const [dropdownVisible, setDropdownVisible] = createSignal(false);
  const startLocation = useLocation().pathname.split("/")[1];
  const [selectedOption, setSelectedOption] = createSignal(
    selectStartLedgerByUrl(startLocation) || options[0],
  );

  const selectOption = (item) => {
    setSelectedOption(item);
    props.onSelect(item.value);
    setDropdownVisible(false);
  };

  return (
    <div id="select-wrapper" class={styles["select-wrapper"]}>
      <div
        class={styles["select"]}
        onMouseDown={() => setDropdownVisible(!dropdownVisible())}
      >
        <input
          type="button"
          id="input"
          value={selectedOption().display}
          onFocus={() => setDropdownVisible(true)}
          onBlur={() => setDropdownVisible(false)}
          class={styles["select-input"]}
        />
        <div
          class={
            styles["select-icon"] +
            " " +
            styles[dropdownVisible() ? "select-icon-up" : "select-icon-down"]
          }
        />
      </div>
      {dropdownVisible() ? (
        <div class={styles["options-container"]}>
          <For each={options}>
            {(item) => (
              <div
                class={
                  styles[
                    item.value === selectedOption().value
                      ? "selected-option"
                      : "option"
                  ]
                }
                onMouseDown={() => selectOption(item)}
              >
                {item.display}
              </div>
            )}
          </For>
        </div>
      ) : null}
    </div>
  );
};

export default Select;
