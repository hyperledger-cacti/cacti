import { Outlet, useLocation } from "react-router-dom";
import styles from "./Root.module.css";
import Menu from "../components/UI/Menu/Menu";
import Home from "../pages/shared/Home/Home";

function Root() {
  const location = useLocation();
  console.log(location);
  return (
    <div className={styles.main}>
      <Menu />
      {location.pathname === "/" ? <Home></Home> : null}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export default Root;
