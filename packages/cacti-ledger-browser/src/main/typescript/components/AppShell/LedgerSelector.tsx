import { useLocation } from "react-router-dom";
import styles from "./LedgerSelector.module.css";
import { useState } from "react";

const options = [
  { value: "", display: "Select the ledger" },
  { value: "eth", display: "Ethereum" },
  { value: "fabric", display: "Fabric" },
];

function LedgerSelector(props: any) {
  const selectStartLedgerByUrl = (path: string) =>
    options.find((option) => option.value === path);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const startLocation = useLocation().pathname.split("/")[1];
  const [selectedOption, setSelectedOption] = useState(
    selectStartLedgerByUrl(startLocation) || options[0],
  );

  const selectOption = (item: any) => {
    setSelectedOption(item);
    props.onSelect(item.value);
    setDropdownVisible(false);
  };

  return (
    <div id="select-wrapper" className={styles["select-wrapper"]}>
      <div
        className={styles["select"]}
        onMouseDown={() => setDropdownVisible(!dropdownVisible)}
      >
        <input
          type="button"
          id="input"
          value={selectedOption.display}
          onFocus={() => setDropdownVisible(true)}
          onBlur={() => setDropdownVisible(false)}
          className={styles["select-input"]}
        />
        <div
          className={
            styles["select-icon"] +
            " " +
            styles[dropdownVisible ? "select-icon-up" : "select-icon-down"]
          }
        />
      </div>
      {dropdownVisible ? (
        <div className={styles["options-container"]}>
          {options.map(function (item) {
            return (
              <div
                className={
                  styles[
                    item.value === selectedOption.value
                      ? "selected-option"
                      : "option"
                  ]
                }
                onMouseDown={() => selectOption(item)}
              >
                {item.display}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default LedgerSelector;
