import CardWrapper from "../../../components/ui/CardWrapper";
import { useQuery } from "@tanstack/react-query";
import { persistencePluginStatusQuery } from "../queries";

function StatusPage() {
  const { isSuccess, isError, data, error } = useQuery(
    persistencePluginStatusQuery(),
  );

  if (isError) {
    console.error("Data fetch error:", error);
  }

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
        data={
          isSuccess
            ? (data as any).map((p: any) => {
                return {
                  ...p,
                  is_schema_initialized: p.is_schema_initialized
                    ? "Setup complete"
                    : "No schema",
                };
              })
            : []
        }
        title={"Persistence Plugins"}
        display={"All"}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default StatusPage;
