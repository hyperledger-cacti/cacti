import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function Accounts() {
  const params = useParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<{ address: string }[]>([]);
  const [searchKey, setSearchKey] = useState("");

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
        .from(`token_${params.standard?.toLowerCase()}`)
        .select("account_address");
      if (data) {
        const objData = [...new Set(data.map((el) => el.account_address))].map(
          (el) => ({ address: el }),
        );
        setAccounts(objData);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div>
      <CardWrapper
        display={"All"}
        title={"Accounts"}
        columns={tableProps}
        data={accounts}
        filters={["address"]}
        trimmed={false}
        getSearchValue={(e: any) => setSearchKey(e)}
      ></CardWrapper>
    </div>
  );
}

export default Accounts;
