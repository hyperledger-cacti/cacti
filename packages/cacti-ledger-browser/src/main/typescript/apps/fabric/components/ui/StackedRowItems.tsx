import React from "react";
import Stack from "@mui/material/Stack";

export interface StackedRowItemsProps {
  children: React.ReactElement[];
}

/**
 * Simple component that puts all the children in a row, space-between with minimal spacing 1.
 * Uses MUI Stack.
 */
export default function StackedRowItems({ children }: StackedRowItemsProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={{ xs: 1 }}
    >
      {children}
    </Stack>
  );
}
