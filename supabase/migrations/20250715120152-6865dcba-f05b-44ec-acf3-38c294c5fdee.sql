-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for products (public read access)
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for cart_items
CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart items" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart items" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart items" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for order_items
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamps
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 50 sample products
INSERT INTO public.products (name, description, price, image_url, category, stock_quantity) VALUES
('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 199.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Electronics', 50),
('Smartphone', 'Latest flagship smartphone with advanced camera', 799.99, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'Electronics', 30),
('Laptop', 'High-performance laptop for work and gaming', 1299.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 'Electronics', 25),
('Coffee Maker', 'Automatic coffee maker with timer', 89.99, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 'Home', 40),
('Running Shoes', 'Comfortable running shoes for daily workouts', 129.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'Sports', 60),
('Backpack', 'Durable travel backpack with multiple compartments', 79.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Travel', 35),
('Sunglasses', 'UV protection sunglasses with polarized lenses', 149.99, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', 'Fashion', 45),
('Watch', 'Elegant wristwatch with leather strap', 299.99, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', 'Fashion', 20),
('Bluetooth Speaker', 'Portable Bluetooth speaker with bass boost', 59.99, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 'Electronics', 55),
('Yoga Mat', 'Non-slip yoga mat for exercise and meditation', 39.99, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400', 'Sports', 70),
('Gaming Mouse', 'High-precision gaming mouse with RGB lighting', 89.99, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400', 'Electronics', 40),
('Desk Lamp', 'LED desk lamp with adjustable brightness', 69.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', 'Home', 30),
('Water Bottle', 'Insulated stainless steel water bottle', 29.99, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', 'Sports', 80),
('Hoodie', 'Comfortable cotton hoodie for casual wear', 59.99, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', 'Fashion', 50),
('Wireless Charger', 'Fast wireless charging pad for smartphones', 39.99, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', 'Electronics', 45),
('Cookbook', 'Professional cookbook with 200+ recipes', 24.99, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400', 'Books', 60),
('Plant Pot', 'Ceramic plant pot with drainage system', 19.99, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400', 'Home', 65),
('Fitness Tracker', 'Smart fitness tracker with heart rate monitor', 179.99, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400', 'Electronics', 35),
('Jeans', 'Classic denim jeans with perfect fit', 79.99, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', 'Fashion', 55),
('Power Bank', 'Portable power bank with fast charging', 49.99, 'https://images.unsplash.com/photo-1609592625972-54c4c61b2f84?w=400', 'Electronics', 70),
('Tablet', '10-inch tablet for entertainment and work', 399.99, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', 'Electronics', 25),
('Keyboard', 'Mechanical keyboard for gaming and typing', 149.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', 'Electronics', 40),
('Perfume', 'Luxury perfume with long-lasting fragrance', 89.99, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400', 'Beauty', 30),
('Camping Tent', 'Waterproof camping tent for 4 people', 199.99, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400', 'Outdoor', 20),
('Blender', 'High-speed blender for smoothies and shakes', 119.99, 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400', 'Home', 35),
('Sneakers', 'Stylish sneakers for everyday wear', 99.99, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', 'Fashion', 65),
('Camera', 'Digital camera with 4K video recording', 899.99, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', 'Electronics', 15),
('Pillow', 'Memory foam pillow for better sleep', 49.99, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', 'Home', 50),
('Phone Case', 'Protective phone case with wireless charging', 24.99, 'https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=400', 'Electronics', 80),
('Bicycle', 'Mountain bicycle for outdoor adventures', 599.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'Sports', 10),
('Handbag', 'Leather handbag with multiple compartments', 159.99, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', 'Fashion', 40),
('Monitor', '27-inch 4K monitor for gaming and work', 349.99, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 'Electronics', 25),
('Skincare Set', 'Complete skincare routine set', 79.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 'Beauty', 45),
('Electric Kettle', 'Fast-boiling electric kettle with temperature control', 59.99, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400', 'Home', 55),
('Wireless Earbuds', 'True wireless earbuds with noise cancellation', 129.99, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', 'Electronics', 60),
('Dress', 'Elegant dress for special occasions', 119.99, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'Fashion', 35),
('Air Purifier', 'HEPA air purifier for clean indoor air', 199.99, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Home', 30),
('Protein Powder', 'Whey protein powder for muscle building', 39.99, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Health', 70),
('Notebook', 'Premium leather-bound notebook', 19.99, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', 'Stationery', 85),
('Wallet', 'Minimalist leather wallet with RFID protection', 69.99, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', 'Fashion', 50),
('Desk Chair', 'Ergonomic office chair with lumbar support', 299.99, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', 'Home', 20),
('Thermos', 'Vacuum insulated thermos for hot beverages', 34.99, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', 'Home', 60),
('USB Cable', 'High-speed USB-C cable for data and charging', 14.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'Electronics', 100),
('Scarf', 'Soft cashmere scarf for winter warmth', 89.99, 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400', 'Fashion', 40),
('Gaming Controller', 'Wireless gaming controller with haptic feedback', 79.99, 'https://images.unsplash.com/photo-1615680022647-99c397cbcaea?w=400', 'Electronics', 45),
('Candle', 'Scented soy candle with wooden wick', 24.99, 'https://images.unsplash.com/photo-1602874801006-3ad6e8d8a5d6?w=400', 'Home', 75),
('Moisturizer', 'Anti-aging moisturizer with SPF protection', 54.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 'Beauty', 55),
('Travel Mug', 'Leak-proof travel mug with temperature retention', 29.99, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', 'Travel', 65),
('Board Game', 'Strategy board game for family entertainment', 49.99, 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400', 'Games', 40),
('LED Strip', 'Smart LED strip lights with app control', 39.99, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'Electronics', 80);