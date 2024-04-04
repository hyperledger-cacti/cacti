import { useEffect, useState } from "react";
import { supabase } from "../../../common/supabase-client";
import CardWrapper from "../../../components/ui/CardWrapper";

function StatusPage() {
  const [getPluginStatus, setPluginStatuse] = useState<unknown[]>([]);

  const fetchPluginStatus = async () => {
    try {
      const { data, error } = await supabase.from("plugin_status").select();
      if (error) {
        throw new Error(
          `Could not get plugin statuses from the DB: ${error.message}`,
        );
      }

      if (data) {
        setPluginStatuse(
          data.map((p) => {
            return {
              ...p,
              is_schema_initialized: p.is_schema_initialized
                ? "Setup complete"
                : "No schema",
            };
          }),
        );
      }
    } catch (error) {
      console.error("Error when fetching plugin statuses:", error);
    }
  };

  useEffect(() => {
    fetchPluginStatus();
  }, []);

  return (
    <div>
      <CardWrapper
        columns={
          {
            schema: [
              { display: "Name", objProp: ["name"] },
              { display: "Instance ID", objProp: ["last_instance_id"] },
              { display: "Status", objProp: ["is_schema_initialized"] },
              { display: "Created at", objProp: ["created_at"] },
              { display: "Connected at", objProp: ["last_connected_at"] },
            ],
          } as any
        }
        data={getPluginStatus}
        title={"Persistence Plugins"}
        display={"All"}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default StatusPage;
