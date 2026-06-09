import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { PriceTag } from '@/components/common/PriceTag';

// Hiển thị mức giá thấp nhất trong các variant — chỉ để render, BE đã tính sẵn giá từng variant.
function lowestPrice(product) {
  if (!product?.variants?.length) return null;
  return product.variants.reduce((min, v) => (v.price < min ? v.price : min), product.variants[0].price);
}

export function ProductCard({ product }) {
  const price = lowestPrice(product);

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <Card className="h-full overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardContent className="px-4 pt-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0">
          {price != null ? <PriceTag value={price} className="text-base text-primary" /> : <span className="text-sm text-muted-foreground">Liên hệ</span>}
        </CardFooter>
      </Card>
    </Link>
  );
}
