import { AppTimestamp } from "../utils/date";

export type WithdrawalMethod = "VIREMENT_BANCAIRE" | "CCP_BARIDIMOB";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "PAID" | "CANCELED";

export interface WithdrawalRequest {
  id: string;
  sellerId: string;
  shopName: string;
  amount: number;
  method: WithdrawalMethod;
  accountDetails: string; // The RIB or CCP number
  status: WithdrawalStatus;

  // Uploaded by admin upon payment
  receiptUrl?: string;

  createdAt?: AppTimestamp;
  processedAt?: AppTimestamp;
  paidAt?: AppTimestamp;
}
