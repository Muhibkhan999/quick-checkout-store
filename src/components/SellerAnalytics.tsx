import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingBag, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  avgOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  productPerformance: Array<{ name: string; revenue: number; orders: number; stock: number }>;
  categoryDistribution: Array<{ name: string; value: number; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const SellerAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Get date range
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Load seller's products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];

      if (productIds.length === 0) {
        setAnalytics({
          totalRevenue: 0,
          totalOrders: 0,
          totalProducts: 0,
          avgOrderValue: 0,
          revenueGrowth: 0,
          orderGrowth: 0,
          revenueByDay: [],
          productPerformance: [],
          categoryDistribution: []
        });
        setLoading(false);
        return;
      }

      // Load order items for the time period
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders!inner (
            id,
            created_at,
            status,
            user_id
          ),
          product:products!inner (
            name,
            category
          )
        `)
        .in('product_id', productIds)
        .gte('order.created_at', startDate.toISOString());

      if (orderItemsError) throw orderItemsError;

      // Calculate metrics
      const totalRevenue = orderItems?.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0) || 0;
      const totalOrders = new Set(orderItems?.map(item => item.order.id)).size;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate growth (compare with previous period)
      const prevStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const { data: prevOrderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders!inner (
            id,
            created_at,
            status
          )
        `)
        .in('product_id', productIds)
        .gte('order.created_at', prevStartDate.toISOString())
        .lt('order.created_at', startDate.toISOString());

      const prevRevenue = prevOrderItems?.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0) || 0;
      const prevOrders = new Set(prevOrderItems?.map(item => item.order.id)).size;

      const revenueGrowth = prevRevenue > 0 ? 
        ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const orderGrowth = prevOrders > 0 ? 
        ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

      // Revenue by day
      const revenueByDay = [];
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayItems = orderItems?.filter(item => {
          const itemDate = new Date(item.order.created_at);
          return itemDate >= dayStart && itemDate < dayEnd;
        }) || [];
        
        const dayRevenue = dayItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0);
        const dayOrders = new Set(dayItems.map(item => item.order.id)).size;
        
        revenueByDay.push({
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
          orders: dayOrders
        });
      }

      // Product performance
      const productPerformance = products?.map(product => {
        const productItems = orderItems?.filter(item => item.product_id === product.id) || [];
        const revenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orders = productItems.length;
        
        return {
          name: product.name,
          revenue,
          orders,
          stock: product.stock_quantity || 0
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

      // Category distribution
      const categoryMap = new Map();
      products?.forEach(product => {
        const category = product.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { revenue: 0, count: 0 });
        }
        
        const productItems = orderItems?.filter(item => item.product_id === product.id) || [];
        const revenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const existing = categoryMap.get(category);
        categoryMap.set(category, {
          revenue: existing.revenue + revenue,
          count: existing.count + 1
        });
      });

      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.revenue,
        count: data.count
      }));

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalProducts: products?.length || 0,
        avgOrderValue,
        revenueGrowth,
        orderGrowth,
        revenueByDay,
        productPerformance,
        categoryDistribution
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Time Range:</span>
        {(['7d', '30d', '90d'] as const).map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </Badge>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(analytics.revenueGrowth).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.orderGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(analytics.orderGrowth).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Product Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.productPerformance.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="orders"
                    label={({ name, orders }) => orders > 0 ? `${name}: ${orders}` : ''}
                  >
                    {analytics.productPerformance.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Product Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerAnalytics;