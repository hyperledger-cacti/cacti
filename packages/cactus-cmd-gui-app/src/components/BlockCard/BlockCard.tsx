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
      <span> {props.created_at.toLocaleString()}</span>
      <span class={styles["block-num"]}>{props.number}</span>
      <span class={styles["block-hash"]}>
        <HiSolidHashtag /> {props.hash}
      </span>
    </div>
  );
};

export default BlockCard;
