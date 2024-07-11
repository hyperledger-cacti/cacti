import * as React from "react";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { TransitionProps } from "@mui/material/transitions";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * Error dialog that covers entire screen in case of connection error.
 * Can't be closed or dismissed.
 *
 * @todo extend the guidliness, link to the documentation once it's ready.
 */
export default function ConnectionFailedDialog() {
  // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
  // const supabaseSchema = import.meta.env.VITE_SUPABASE_SCHEMA;

  return (
    <Dialog fullScreen open={true} TransitionComponent={Transition}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "gray",
          flex: 1,
        }}
      >
        <Paper elevation={3} sx={{ margin: 5, padding: 5, width: "100%" }}>
          <Typography variant="h2" fontWeight="bold" color="error">
            Connection Error
          </Typography>

          <Typography variant="h4" sx={{ marginTop: 3 }}>
            We were unable to connect to the Supabase instance containing the
            app configuration data for this GUI.
          </Typography>
          <Typography variant="h4" sx={{ marginTop: 3 }}>
            Please follow the setup guide to resolve the issue.
          </Typography>

          {/* <Typography variant="h5" fontWeight="bold" sx={{ marginTop: 3 }}>
            Connection Details
          </Typography>
          <ul>
            <li>
              <span style={{ fontWeight: "bold" }}>VITE_SUPABASE_URL:</span>{" "}
              {supabaseUrl}
            </li>
            <li>
              <span style={{ fontWeight: "bold" }}>VITE_SUPABASE_KEY:</span>{" "}
              {supabaseKey}
            </li>
            <li>
              <span style={{ fontWeight: "bold" }}>VITE_SUPABASE_SCHEMA:</span>{" "}
              {supabaseSchema}
            </li>
          </ul>

          <Typography sx={{ marginTop: 3 }}>
            If the connection details are invalid, please update them in the
            .env file, then rebuild and run the application again.
          </Typography> */}
        </Paper>
      </Box>
    </Dialog>
  );
}
