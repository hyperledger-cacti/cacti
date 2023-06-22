import { Component } from "solid-js";
import Pages from "./pages/Pages";
import Menu from "./components/UI/Menu/Menu";
// @ts-expect-error
import styles from "./App.module.css";

const App: Component = () => {
  return (
    <div class={styles.main}>
      <Menu />
      <div class={styles.content}>
        <Pages />
      </div>
    </div>
  );
};

export default App;
