import CardWrapper from "../../../../components/ui/CardWrapper";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ethGetTokenOwners } from "../../queries";

function Accounts() {
  const params = useParams();
  if (typeof params.standard === "undefined") {
    throw new Error(`Accounts called with empty token standard ${params}`);
  }
  const navigate = useNavigate();
  const { isError, data, error } = useQuery(
    ethGetTokenOwners(params.standard.toLowerCase()),
  );
  const [searchKey, setSearchKey] = useState("");

  if (isError) {
    console.error("Token owners fetch error:", error);
  }

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

  return (
    <div>
      <CardWrapper
        display={"All"}
        title={"Accounts"}
        columns={tableProps}
        data={data ?? []}
        filters={["address"]}
        trimmed={false}
        getSearchValue={(e: any) => setSearchKey(e)}
      ></CardWrapper>
    </div>
  );
}

export default Accounts;
