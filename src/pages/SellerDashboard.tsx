import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, ShoppingBag, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
  created_at: string;
}

interface OrderItem {
  quantity: number;
  price: number;
  order: {
    id: string;
    status: string;
    created_at: string;
  };
}

const SellerDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== 'seller') {
      navigate('/auth');
      return;
    }

    const loadSellerData = async () => {
      // Load seller's products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
      } else {
        setProducts(productsData || []);
      }

      // Load order items for seller's products
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          order:orders (
            id,
            status,
            created_at
          )
        `)
        .in('product_id', productsData?.map(p => p.id) || []);

      if (orderItemsError) {
        console.error('Error loading order items:', orderItemsError);
      } else {
        setOrderItems(orderItemsData || []);
      }

      setLoading(false);
    };

    loadSellerData();
  }, [user, userRole, navigate]);

  const totalRevenue = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalOrders = orderItems.length;
  const lowStockProducts = products.filter(p => p.stock_quantity < 10);

  if (!user || userRole !== 'seller') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>You need a seller account to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and track sales</p>
          </div>
          <Button onClick={() => navigate('/seller/products/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading products...</p>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No products yet</p>
                  <Button onClick={() => navigate('/seller/products/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">${product.price}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={product.stock_quantity < 10 ? "destructive" : "secondary"}>
                          {product.stock_quantity} in stock
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {products.length > 5 && (
                    <Button variant="outline" onClick={() => navigate('/seller/products')} className="w-full">
                      View All Products
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading orders...</p>
              ) : orderItems.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {orderItems.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-semibold">Order #{item.order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                        <Badge variant="secondary">{item.order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SellerDashboard;