import TokenAccount from './TokenAccount'
import { Component } from 'solid-js'
import { createSignal, createEffect } from 'solid-js'
import { TokenMetadata20 } from '../../schema/supabase-types'
import { supabase } from '../../supabase-client'
// @ts-expect-error
import styles from "./TokenHeader.module.css";

const TokenHeader: Component<{ accountNum: string; token_address: string }> = (
  props,
) => {
  const [tokenData, setTokenData] = createSignal<TokenMetadata20 | any>();

  createEffect(async () => {
    try {
      const { data, error } = await supabase
        .from(`token_metadata_erc20`)
        .select("*")
        .match({ address: props.token_address });
      console.log(data);
      if (data?.[0]) {
        setTokenData(data[0]);
      } else {
        throw new Error("Failed to load token details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  }, []);

  return (
    <div class={styles["token-header"]}>
            <TokenAccount accountNum={props.accountNum} />
      <div class={styles["token-details"]}>
        <p>
          <b>Address:</b> {props.token_address}
        </p>
        <p>
          <b>Created at:</b> {tokenData()?.created_at}
        </p>
        <p>
          <b>Total supply: </b>
          {tokenData()?.total_supply}
        </p>
      </div>
    </div>
  );
};

export default TokenHeader;


