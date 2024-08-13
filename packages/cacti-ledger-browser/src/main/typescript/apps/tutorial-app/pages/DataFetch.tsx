import React from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import PageTitle from "../../../components/ui/PageTitle";
import { useNotification } from "../../../common/context/NotificationContext";

/**
 * Simple method for fetching test data from restful-api.dev
 */
async function fetchSampleData() {
  const response = await axios.get("https://api.restful-api.dev/objects/7");
  return response.data;
}

export default function DataFetch() {
  const { showNotification } = useNotification();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["sampleFetch"],
    queryFn: fetchSampleData,
  });

  React.useEffect(() => {
    isError &&
      showNotification(`Could not fetch sample data: ${error}`, "error");
  }, [isError]);

  React.useEffect(() => {
    !isPending &&
      data &&
      showNotification(`Fetched data: ${data.name}`, "success");
  }, [data, isPending]);

  return (
    <Box>
      <PageTitle>Data Fetch Sample</PageTitle>

      <Box>
        <Typography variant="h5">Fetched object: {data?.name ?? ""}</Typography>
      </Box>
    </Box>
  );
}
