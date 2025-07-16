import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  seller_id: string;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts(data || []);
        setFilteredProducts(data || []);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(data?.map(p => p.category) || [])];
        setCategories(uniqueCategories);
      }
      setLoading(false);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome to ShopMart</h1>
          <p className="text-xl text-muted-foreground mb-6">
            A marketplace where sellers create real products and buyers discover amazing deals
          </p>
          {!user ? (
            <div>
              <p className="text-lg text-muted-foreground mb-4">
                Join our marketplace with {products.length} authentic products
              </p>
              <Button size="lg" onClick={() => navigate('/auth')}>
                Join Our Marketplace
              </Button>
            </div>
          ) : userRole === 'seller' ? (
            <div>
              <p className="text-lg text-muted-foreground mb-4">
                You have access to seller tools
              </p>
              <Button size="lg" onClick={() => navigate('/seller/products/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">
              Browse our collection of {products.length} authentic products from real sellers
            </p>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            {products.length === 0 ? (
              <div>
                <p className="text-lg text-muted-foreground mb-4">No products available yet.</p>
                {userRole === 'seller' ? (
                  <Button onClick={() => navigate('/seller/products/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add the First Product
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Sellers will add products soon!</p>
                )}
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">No products found matching your criteria.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                showAddToCart={userRole === 'buyer'} 
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
