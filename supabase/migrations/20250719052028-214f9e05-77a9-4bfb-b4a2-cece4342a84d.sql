-- Fix RLS policies for order_items to allow insertions during checkout
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

-- Ensure messages table has proper policies and is set up for realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add the messages table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;