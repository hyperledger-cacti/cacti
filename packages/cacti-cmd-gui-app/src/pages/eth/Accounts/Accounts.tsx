import { createSignal, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";

const Accounts = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = createSignal<{ address: string }[]>([]);
  const [searchKey, setSearchKey] = createSignal("");

  const tableProps = {
    onClick: {
      action: (param: string) => navigate(`/eth/${params.standard}/${param}`),
      prop: "address",
    },
    schema: [
      {
        display: "Account address",
        objProp: ["address"],
      },
    ],
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from(`token_${params.standard.toLowerCase()}`)
        .select("account_address");
      if (data) {
        const objData = [
          ...new Set(data.map((el) => el.account_address)),
        ].map((el) => ({ address: el }));
        setAccounts(objData);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error:any) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchAccounts();
  }, []);

  return (
    <div>
      <CardWrapper
        display={"All"}
        title={"Accounts"}
        columns={tableProps}
        data={accounts()}
        filters={["address"]}
        trimmed={false}
        getSearchValue={(e) => setSearchKey(e)}
      ></CardWrapper>
    </div>
  );
};

export default Accounts;
