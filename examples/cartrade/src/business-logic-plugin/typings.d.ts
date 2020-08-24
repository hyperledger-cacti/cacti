declare module global {
  type Error = {
    message: string;
    status: number;
  }
}
