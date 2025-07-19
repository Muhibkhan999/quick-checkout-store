import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { CreditCard, Truck } from 'lucide-react';
import MapLocationPicker from '@/components/MapLocationPicker';

const Checkout = () => {
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      if (paymentMethod === 'card') {
        // Handle Stripe payment
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: Math.round(cartTotal * 100), // Convert to cents
            currency: 'usd',
            shipping_address: shippingAddress,
            cart_items: cartItems
          }
        });

        if (error) throw error;
        
        // Redirect to Stripe Checkout
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment",
          description: "You'll be redirected to complete your payment."
        });
      } else {
        // Handle cash on delivery
        console.log('Creating cash order for user:', user.id);
        console.log('Cart items:', cartItems);
        console.log('Cart total:', cartTotal);
        console.log('Shipping address:', shippingAddress);
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_amount: cartTotal,
            shipping_address: shippingAddress,
            payment_method: 'cash',
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        console.log('Order created successfully:', order);

        // Create order items
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product.price
        }));

        console.log('Inserting order items:', orderItems);

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Order items creation error:', itemsError);
          throw itemsError;
        }

        console.log('Order items created successfully');

        // Notify sellers
        await supabase.functions.invoke('notify-sellers', {
          body: { order_id: order.id }
        });

        // Clear cart
        await clearCart();

        toast({
          title: "Order placed successfully!",
          description: "Your cash on delivery order has been confirmed. Our driver will contact you soon."
        });

        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <form onSubmit={handlePlaceOrder} className="space-y-6">
          <MapLocationPicker
            onLocationSelect={(address) => setShippingAddress(address)}
            initialAddress={shippingAddress}
          />

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.product.name} x {item.quantity}
                    </span>
                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center cursor-pointer">
                    <Truck className="w-4 h-4 mr-2" />
                    Cash on Delivery
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Credit/Debit Card (Stripe)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground mt-3">
                {paymentMethod === 'cash' 
                  ? 'Pay when the driver delivers your order' 
                  : 'Secure payment via Stripe'}
              </p>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || cartItems.length === 0}
          >
            {loading ? 'Processing...' : 
             paymentMethod === 'card' ? 'Pay with Card' : 'Place Order (Cash)'}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;