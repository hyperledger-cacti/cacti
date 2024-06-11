import TagIcon from "@mui/icons-material/Tag";

import styles from "./BlockCard.module.css";
import { useNavigate } from "react-router-dom";

function BlockCard(props: any) {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/blockDetails/${props.number}`);
  };

  return (
    <div className={styles["block-card"]} onClick={handleClick}>
      <p> {props.created_at.toLocaleString()}</p>
      <p className={styles["block-num"]}>{props.number}</p>
      <p className={styles["block-hash"]}>
        <TagIcon /> {props.hash}
      </p>
    </div>
  );
}

export default BlockCard;
