import { useNavigate, useParams } from "react-router-dom";
import styles from "./AccountCard.module.css";

function AccountCard(props: any) {
  const params = useParams();
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/${params.standard}/${props.address}`);
  };
  return (
    <div className={styles["card"]} onClick={handleClick}>
      <span>{props.address}</span>
    </div>
  );
}

export default AccountCard;
