import styles from "./Button.module.css";

function Button(props: any) {
  type ObjectKey = keyof typeof styles;
  const buttonTypeStyle = `button-${props.type}` as ObjectKey;

  const handleClick = (e: { stopPropagation: () => void; }) => {
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
