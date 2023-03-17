import { useNavigate } from "@solidjs/router";
import { HiSolidHashtag } from "solid-icons/hi";
import { Component } from "solid-js";
// @ts-expect-error
import styles from "./BlockCard.module.css";

const BlockCard: Component<{
  number: string;
  created_at: Date;
  hash: string;
}> = (props) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/blockDetails/${props.number}`);
  };

  return (
    <div class={styles["block-card"]} onClick={handleClick}>
      <p> {props.created_at.toLocaleString()}</p>
      <p class={styles["block-num"]}>{props.number}</p>
      <p class={styles["block-hash"]}>
        <HiSolidHashtag /> {props.hash}
      </p>
    </div>
  );
};

export default BlockCard;
