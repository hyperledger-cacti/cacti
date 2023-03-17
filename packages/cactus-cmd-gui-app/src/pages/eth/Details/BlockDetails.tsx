import { createEffect, createSignal, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import { Block } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./Details.module.css";

const blockDetails = () => {
  const [details, setDetails] = createSignal<Block | any>({});
  const params = useParams();

  createEffect(async () => {
    try {
      const { data, error } = await supabase
        .from("block")
        .select("*")
        .match({ number: params.number });
      if (data?.[0]) {
        setDetails(data[0]);
      } else {
        throw new Error("Failed to load block details");
      }
    } catch (error:any) {
      console.error(error.message);
    }
  }, []);

  return (
    <div>
      <div class={styles["details-card"]}>
        <Show when={details} fallback={<div>Failed to load details</div>}>
          <h1>Block Details</h1>
          <p>
            <b> Address:</b> {details().number}{" "}
          </p>
          <p>
            {" "}
            <b>Created at: </b>
            {details().created_at}
          </p>
          <p>
            <b>Hash: </b>
            {details().hash}
          </p>
          <p>
            <b>Number of transaction: </b>
            {details().number_of_tx}
          </p>
          <p>
            <b>Sync at: </b>
            {details().sync_at}
          </p>
        </Show>
      </div>
    </div>
  );
};

export default blockDetails;
