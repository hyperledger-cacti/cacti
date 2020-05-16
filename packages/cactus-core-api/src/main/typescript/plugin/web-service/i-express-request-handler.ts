export type IExpressRequestHandler = (
  req: any,
  res: any,
  next: (err: any) => void
) => void;
