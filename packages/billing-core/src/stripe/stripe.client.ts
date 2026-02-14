import Stripe from "stripe";

export function getStripe(secretKey: string): Stripe {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is missing");
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
}
