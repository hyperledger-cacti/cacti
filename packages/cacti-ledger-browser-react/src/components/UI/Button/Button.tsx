import styles from "./Button.module.css";

function Button(props) {
  type ObjectKey = keyof typeof styles;
  const buttonTypeStyle = `button-${props.type}` as ObjectKey;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={styles.button + " " + styles[buttonTypeStyle]}
    >
      {props.children}
    </button>
  );
}

export default Button;
