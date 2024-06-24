import React, { createContext, useState, useContext, ReactNode } from "react";
import Alert, { AlertColor } from "@mui/material/Alert";
import Slide, { SlideProps } from "@mui/material/Slide";
import Snackbar from "@mui/material/Snackbar";

const autoHideDuration = 1000 * 3; // 3 seconds
const defaultSeverity: AlertColor = "info";

type Notification = {
  message: string;
  severity?: AlertColor;
};

type NotificationContextType = {
  showNotification: (message: string, severity?: AlertColor) => void;
};

const NotificationContext = createContext<NotificationContextType>({
  showNotification: (message: string) => {
    console.log("Notification before context init:", message);
  },
});

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notification, setNotification] = useState<Notification | undefined>(
    undefined,
  );
  const isNotification = Boolean(notification);

  const showNotification = (message: string, severity?: AlertColor) => {
    if (severity === "error") {
      console.error("Error notification:", message);
    }
    setNotification({ message, severity });
  };

  const closeNotification = () => {
    setNotification(undefined);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {isNotification && (
        <Snackbar
          open={isNotification}
          autoHideDuration={autoHideDuration}
          TransitionComponent={SlideTransition}
          onClose={closeNotification}
        >
          <Alert
            onClose={closeNotification}
            severity={notification?.severity ?? defaultSeverity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType =>
  useContext(NotificationContext);
