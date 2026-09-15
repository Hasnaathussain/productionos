import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
  const body = await request.text();
  const event = JSON.parse(body);
  console.log("payment event", event);
  return Response.json({ received: true });
}
