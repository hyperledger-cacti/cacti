import type { Request, Response, NextFunction } from "express";

export type IExpressRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
