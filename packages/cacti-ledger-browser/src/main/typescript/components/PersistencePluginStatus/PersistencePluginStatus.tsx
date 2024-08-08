import React from "react";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

import StackedRowItems from "../ui/StackedRowItems";
import { persistencePluginStatus } from "../../common/queries";

type DateTimeStringProps = {
  dateString: string | undefined;
};

function DateTimeString({ dateString }: DateTimeStringProps) {
  const date = dateString ? new Date(dateString) : new Date();

  return <Typography>{date.toLocaleString()}</Typography>;
}

type PersistencePluginStatusProps = {
  pluginName: string;
};

/**
 * Box that fetches and displays persistence plugin status from the database.
 */
export default function PersistencePluginStatus({
  pluginName,
}: PersistencePluginStatusProps) {
  const { isError, isPending, data, error } = useQuery(
    persistencePluginStatus(pluginName),
  );

  React.useEffect(() => {
    isError && console.error(`Could get ${pluginName} status: ${error}`);
  }, [isError]);

  return (
    <Box>
      {isPending && (
        <CircularProgress
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}
      <Typography variant="h5">Persistence Plugin Status</Typography>
      <StackedRowItems>
        <Typography>Plugin Name:</Typography>
        <Typography>{data?.name}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <Typography>Instance ID:</Typography>
        <Typography>{data?.last_instance_id}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <Typography>Is Schema Initialized:</Typography>
        <Typography>
          {data?.is_schema_initialized ? "True" : "False"}
        </Typography>
      </StackedRowItems>
      <StackedRowItems>
        <Typography>Created At:</Typography>
        <DateTimeString dateString={data?.created_at} />
      </StackedRowItems>
      <StackedRowItems>
        <Typography>Last Connected At:</Typography>
        <DateTimeString dateString={data?.last_connected_at} />
      </StackedRowItems>
    </Box>
  );
}
