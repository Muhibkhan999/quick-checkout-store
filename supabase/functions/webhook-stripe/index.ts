import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // Verify webhook signature (in production you should set STRIPE_WEBHOOK_SECRET)
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.log("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("Payment successful for session:", session.id);

      // Update order status to paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_session_id", session.id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      // Get the order to notify sellers
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .single();

      if (orderError) {
        console.error("Error fetching order:", orderError);
        throw orderError;
      }

      // Notify sellers about the paid order
      if (order) {
        const { error: notifyError } = await supabase.functions.invoke('notify-sellers', {
          body: { order_id: order.id }
        });

        if (notifyError) {
          console.error("Error notifying sellers:", notifyError);
        }
      }
    }

    return new Response("Webhook handled successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 500 });
  }
});