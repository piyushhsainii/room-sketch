// PATH: app/customer-portal/route.ts
import { CustomerPortal } from "@dodopayments/nextjs";

// GET /customer-portal?customer_id=cus_xxx — lets a user manage/cancel
// their subscription. You'll need to store the Dodo customer_id somewhere
// (see note in the webhook handler — subscriptions table needs a column
// for this; not present in the current schema, see reply below).
export const GET = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "test_mode"
    | "live_mode",
});
