import styles from "./Dashboard.module.css";
import Transactions from "../Transactions/Transactions";
import Blocks from "../Blocks/Blocks";

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <div className={styles["dashboard-wrapper"]}>
        <Transactions />
        <Blocks />
      </div>
    </div>
  );
}

export default Dashboard;
