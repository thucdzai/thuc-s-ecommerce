import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/common/ProductCard';
import { LoadingState, ErrorState } from '@/components/common/States';
import { productsApi, categoriesApi } from '@/api';

function CategoryStrip() {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.tree });
  if (!categories?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button key={category.id} variant="outline" size="sm" asChild>
          <Link to={`/products?categoryId=${category.id}`}>{category.name}</Link>
        </Button>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', { page: 1, limit: 8, sort: 'newest' }],
    queryFn: () => productsApi.list({ page: 1, limit: 8, sort: 'newest' }),
  });

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-12">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">TTTN Shop</h1>
          <p className="text-muted-foreground">Chọn sản phẩm, đặt hàng, theo dõi vận chuyển — tất cả trong một nơi.</p>
          <Button size="lg" asChild>
            <Link to="/products">
              Khám phá ngay <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Danh mục nổi bật</h2>
        <CategoryStrip />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sản phẩm mới nhất</h2>
          <Button variant="ghost" asChild>
            <Link to="/products">
              Xem tất cả <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} message="Không thể tải sản phẩm" />}
        {data?.items?.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
