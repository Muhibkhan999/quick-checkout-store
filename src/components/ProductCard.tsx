import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import ChatSystem from '@/components/ChatSystem';

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

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  showAddToCart = true,
  onAddToCart 
}) => {
  const { addToCart } = useCart();
  const { user, userRole } = useAuth();

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart();
    } else {
      addToCart(product.id);
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardContent className="p-4 flex-grow">
        <div className="aspect-square mb-4 overflow-hidden rounded-md bg-muted">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {product.category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {product.stock_quantity} in stock
            </span>
          </div>
          <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {product.description}
          </p>
          <div className="text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="space-y-2 w-full">
          <div className="flex gap-2">
            <Link to={`/product/${product.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </Link>
            {showAddToCart && (
              <Button 
                onClick={handleAddToCart}
                className="flex-1"
                disabled={product.stock_quantity === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            )}
          </div>
          
          {user && userRole === 'buyer' && product.seller_id !== user.id && (
            <ChatSystem
              recipientId={product.seller_id}
              productId={product.id}
              triggerText="Contact Seller"
            />
          )}
        </div>
      </CardFooter>
    </Card>
  );
};