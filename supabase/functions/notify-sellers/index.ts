import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    // Use service role key to bypass RLS for notifications
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get order details with order items and products
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            seller_id
          )
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError) throw orderError;

    // Group products by seller
    const sellerProducts = new Map();
    
    orderData.order_items.forEach((item: any) => {
      const sellerId = item.products.seller_id;
      if (!sellerProducts.has(sellerId)) {
        sellerProducts.set(sellerId, []);
      }
      sellerProducts.get(sellerId).push({
        name: item.products.name,
        quantity: item.quantity,
        price: item.price
      });
    });

    // Create notifications for each seller
    const notifications = [];
    for (const [sellerId, products] of sellerProducts) {
      const productList = products.map((p: any) => `${p.name} (Qty: ${p.quantity})`).join(', ');
      const message = `New order received! Order #${order_id.slice(0, 8)} - Products: ${productList}. Total: $${orderData.total_amount}. Address: ${orderData.shipping_address}. Please assign a driver for delivery.`;
      
      notifications.push({
        seller_id: sellerId,
        order_id: order_id,
        message: message,
        read: false
      });
    }

    // Insert all notifications
    const { error: notificationError } = await supabase
      .from('seller_notifications')
      .insert(notifications);

    if (notificationError) throw notificationError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notifications.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in notify-sellers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});