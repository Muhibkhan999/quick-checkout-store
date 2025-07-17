-- Add payment methods and driver dispatch to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('card', 'cash')) DEFAULT 'cash',
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN driver_assigned BOOLEAN DEFAULT false,
ADD COLUMN driver_notes TEXT,
ADD COLUMN estimated_delivery TIMESTAMPTZ;

-- Create notifications table for sellers
CREATE TABLE public.seller_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for seller notifications
CREATE POLICY "Sellers can view their own notifications" 
ON public.seller_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_id = seller_id
));

CREATE POLICY "System can insert notifications" 
ON public.seller_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sellers can update their own notifications" 
ON public.seller_notifications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_id = seller_id
));

-- Add trigger for notifications table
CREATE TRIGGER update_seller_notifications_updated_at
BEFORE UPDATE ON public.seller_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();