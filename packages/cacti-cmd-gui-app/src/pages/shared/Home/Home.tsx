// @ts-expect-error
import styles from "./Home.module.css"
import { TbCactus } from 'solid-icons/tb'
const Home = () => {
  return (
    <div class={styles.home}><p>Select ledger from the dropdown menu</p>
    <span class={styles['home-icon']}><TbCactus/></span>
    </div>
  )
}

export default Home