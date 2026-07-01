import { AppTimestamp } from "../utils/date";

export interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  blocks: Record<string, unknown>[];
  status: "draft" | "sent";
  stats?: {
    opened: number;
    clicked: number;
    totalSent: number;
  };
  createdAt?: AppTimestamp;
}
