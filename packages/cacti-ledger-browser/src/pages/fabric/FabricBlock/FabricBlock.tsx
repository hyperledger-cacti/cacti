// @ts-expect-error
import styles from './FabricBlock.module.css'
import { createEffect, createSignal, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { supabase } from '../../../supabase-client';

const FabricBlock = () => {
    const [details, setDetails] = createSignal<any>({});
    const params = useParams();
  
    createEffect(async () => {
      try {
        const { data, error } = await supabase
          .from("fabric_blocks")
          .select("*")
          .match({ id: params.id});
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
              <b> ID:</b> {details().id}{" "}
            </p>
            <p>
              {" "}
              <b>Block Number: </b>
              {details().block_number}
            </p>
            <p>
              <b>Hash: </b>
              {details().data_hash}
            </p>
            <p>
              <b>Tx Count: </b>
              {details().tx_count}
            </p>
            <p>
              <b>Created at: </b>
              {details().created_at}
            </p>
            <p>
              {" "}
              <b>Previous Blockhash: </b>
              {details().prev_blockhash}
            </p>
     
            <p>
              {" "}
              <b>Channel name: </b>
              {details().channel_id}
            </p>
            {/*
                   <p>
              {" "}
              <b>Blk Size: </b>
              {details().blksize}
            </p>
            <p>
              {" "}
              <b>Network name: </b>
              {details().network_name}
            </p> */
            }
          </Show>
        </div>
      </div>
    );
  };
export default FabricBlock


