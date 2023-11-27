import { useParams, useNavigate } from "@solidjs/router";
import { Component } from "solid-js";
// @ts-expect-error
import styles from "./AccountCard.module.css";

const AccountCard: Component<{ address: string }> = (props) => {
  const params = useParams();
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/${params.standard}/${props.address}`);
  };
  return (
    <div class={styles["card"]} onClick={handleClick}>
      <span>{props.address}</span>
    </div>
  );
};

export default AccountCard;
