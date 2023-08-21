import { ParentComponent } from "solid-js";
// @ts-expect-error
import styles from "./Button.module.css";

const Button: ParentComponent<{
  type?: string;
  onClick: () => void;
  disabled?: boolean;
}> = (props) => {
  type ObjectKey = keyof typeof styles;
  const buttonTypeStyle = `button-${props.type}` as ObjectKey;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onClick();
  };

  return (
    <button
      onClick={handleClick}
      class={styles.button + " " + styles[buttonTypeStyle]}
    >
      {props.children}
    </button>
  );
};

export default Button;
