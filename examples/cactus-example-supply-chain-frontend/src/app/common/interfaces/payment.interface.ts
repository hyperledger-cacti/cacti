import { PaymentStatus } from "../services/payment.service";

export interface Payment {
  id: string;
  payer: string;
  payee: string;
  amount: string;
  productId: string;
  productType: string;
  status: PaymentStatus | string;
  timestamp: number;
  transactionReference: string;
}
