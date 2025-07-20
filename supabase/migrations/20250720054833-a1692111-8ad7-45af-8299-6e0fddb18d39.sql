-- Create seller analytics table to track revenue and orders
CREATE TABLE public.seller_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sellers can view their own analytics" 
ON public.seller_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_id = seller_analytics.seller_id
));

CREATE POLICY "System can insert analytics" 
ON public.seller_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update analytics" 
ON public.seller_analytics 
FOR UPDATE 
USING (true);

-- Create function to update seller analytics
CREATE OR REPLACE FUNCTION public.update_seller_analytics()
RETURNS TRIGGER AS $$
DECLARE
  seller_uuid UUID;
  order_total NUMERIC;
BEGIN
  -- Get the seller_id from the product
  SELECT seller_id INTO seller_uuid
  FROM products 
  WHERE id = NEW.product_id;
  
  -- Get the order total for this specific order item
  SELECT (NEW.price * NEW.quantity) INTO order_total;
  
  -- Insert or update seller analytics
  INSERT INTO public.seller_analytics (seller_id, total_revenue, total_orders)
  VALUES (seller_uuid, order_total, 1)
  ON CONFLICT (seller_id) 
  DO UPDATE SET
    total_revenue = seller_analytics.total_revenue + order_total,
    total_orders = seller_analytics.total_orders + 1,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update analytics when order items are inserted
CREATE TRIGGER update_seller_analytics_trigger
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_analytics();

-- Add unique constraint on seller_id
ALTER TABLE public.seller_analytics ADD CONSTRAINT unique_seller_analytics UNIQUE (seller_id);

-- Create updated_at trigger
CREATE TRIGGER update_seller_analytics_updated_at
  BEFORE UPDATE ON public.seller_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();