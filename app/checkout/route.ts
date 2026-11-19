// PATH: app/checkout/route.ts
import { Checkout } from "@dodopayments/nextjs";

// Checkout Sessions flow (recommended over static/dynamic per Dodo docs).
// Frontend POSTs { product_cart: [{ product_id, quantity: 1 }], customer, return_url }
// with product_id = your Pro plan's Dodo product ID (create this in the
// Dodo dashboard's Products page first — separate from the `plans` table).

export const POST = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as
    | "test_mode"
    | "live_mode",
  type: "session",
});
