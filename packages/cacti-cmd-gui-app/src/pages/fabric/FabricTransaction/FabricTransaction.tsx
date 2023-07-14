// @ts-expect-error
import styles from './FabricTransaction.module.css'
import { createEffect, createSignal, Show } from 'solid-js';
import { AiOutlineCopy } from 'solid-icons/ai'
import toast, { Toaster } from 'solid-toast';
import { useParams } from '@solidjs/router';
import { supabase } from '../../../supabase-client';
import Button from '../../../components/UI/Button/Button';

const notify = () => toast('Success! Creator ID Bytes was successfully copied to the clipboard.');

const FabricTransaction = () => {
    const [details, setDetails] = createSignal<any>({});
    const params = useParams();
  
    createEffect(async () => {
      try {
        const { data, error } = await supabase
          .from("fabric_transactions")
          .select("*")
          .match({ id: params.id});
        if (data?.[0]) {
            console.log(data)
          setDetails(data[0]);
        } else {
          throw new Error("Failed to load block details");
        }
      } catch (error:any) {
        console.error(error.message);
      }
    }, []);

    const copyIdToClipboard = () => {
      navigator.clipboard.writeText(details().creator_id_bytes)
      notify()
    }
  
    return (
      <div>
        <div class={styles["details-card"]}>
          <Show when={details} fallback={<div>Failed to load details</div>}>
            <h1>Transaction Details</h1>
            <p>
              <b>Created at: </b>
              {details().created_at}
            </p>
            <p>
              <b> Block ID:</b> {details().block_id}{" "}
            </p>
            <p>
              {" "}
              <b>Transaction ID: </b>
              {details().transaction_id}
            </p>
            <p>
              {" "}
              <b>Channel name: </b>
              {details().channel_id}
            </p>
     
            <p>
              {" "}
              <b>Status </b>
              {details().status}
            </p>

            <p>
              {" "}
              <b>Type </b>
              {details().type}
            </p>
            {/*
            <p>
              {" "}
              <b>Validation Code </b>
              {details().validation_code}
            </p>
                   <p>
              {" "}
              <b>Network name: </b>
              {details().network_name}
            </p>
    */}
            <p>
              {" "}
              <b>Chaincode Name: </b>
              {details().chaincode_name}
            </p>
            <p class={styles['details-bytes-wrap']}>
              {" "}
              <b>Creator ID Bytes: </b>
              <span class={styles['details-bytes']}> {details().creator_id_bytes}</span>
              <Button onClick={copyIdToClipboard}> <AiOutlineCopy /> Get Full ID </Button>
            </p>
            <p>
              {" "}
              <b>Creator nonce: </b>
              {details().creator_nonce}
            </p>
            <p>
              {" "}
              <b>Creator MSP ID: </b>
              {details().creator_msp_id}
            </p>
            <p>
              {" "}
              <b>Endorser MSP ID: </b>
              {details().endorser_msp_id}
            </p>
            <p>
              {" "}
              <b>Payload Proposal Hash: </b>
              {details().payload_proposal_hash}
            </p>
          </Show>
        </div>
        <Toaster />
      </div>
    );
  };
export default FabricTransaction


