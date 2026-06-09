import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ProductCard } from '@/components/common/ProductCard';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { categoriesApi, productsApi } from '@/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
];

function flattenCategories(categories, depth = 0) {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function FilterPanel({ params, onChange, categories }) {
  const [minPrice, setMinPrice] = useState(params.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(params.maxPrice ?? '');

  useEffect(() => {
    setMinPrice(params.minPrice ?? '');
    setMaxPrice(params.maxPrice ?? '');
  }, [params.minPrice, params.maxPrice]);

  const flatCategories = flattenCategories(categories ?? []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Danh mục</p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onChange({ categoryId: undefined })}
            className={`rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${!params.categoryId ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
          >
            Tất cả danh mục
          </button>
          {flatCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange({ categoryId: String(category.id) })}
              style={{ paddingLeft: `${8 + category.depth * 14}px` }}
              className={`rounded-md py-1.5 text-left text-sm hover:bg-accent ${
                String(params.categoryId) === String(category.id) ? 'bg-accent font-medium' : 'text-muted-foreground'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-semibold">Khoảng giá</p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="minPrice" className="text-xs text-muted-foreground">Từ</Label>
            <Input id="minPrice" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
          </div>
          <span className="mt-5 text-muted-foreground">—</span>
          <div className="space-y-1">
            <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">Đến</Label>
            <Input id="maxPrice" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="..." />
          </div>
        </form>
        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => onChange({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined })}>
          Áp dụng
        </Button>
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = {
    page: Number(searchParams.get('page') ?? 1),
    limit: DEFAULT_PAGE_SIZE,
    sort: searchParams.get('sort') ?? 'newest',
    q: searchParams.get('q') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
  };

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.tree });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
  });

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ ...patch, page: patch.page ?? undefined }).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    if (!('page' in patch)) next.delete('page');
    setSearchParams(next);
  }

  const activeFilters = [
    params.q && { key: 'q', label: `Từ khóa: "${params.q}"` },
    params.categoryId && { key: 'categoryId', label: 'Danh mục đã chọn' },
    (params.minPrice || params.maxPrice) && { key: 'price', label: 'Khoảng giá đã chọn', keys: ['minPrice', 'maxPrice'] },
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <FilterPanel params={params} categories={categories} onChange={updateParams} />
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{params.q ? `Kết quả tìm kiếm cho "${params.q}"` : 'Tất cả sản phẩm'}</h1>
            {data?.pagination && <p className="text-sm text-muted-foreground">{data.pagination.totalItems} sản phẩm</p>}
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Filter className="mr-2 h-4 w-4" /> Bộ lọc
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto p-4">
                <div className="mt-8">
                  <FilterPanel params={params} categories={categories} onChange={updateParams} />
                </div>
              </SheetContent>
            </Sheet>

            <Select value={params.sort} onValueChange={(value) => updateParams({ sort: value })}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Button
                key={filter.key}
                variant="secondary"
                size="sm"
                onClick={() => updateParams(Object.fromEntries((filter.keys ?? [filter.key]).map((k) => [k, undefined])))}
              >
                {filter.label} <X className="ml-2 h-3 w-3" />
              </Button>
            ))}
          </div>
        )}

        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} message="Không thể tải danh sách sản phẩm" />}
        {!isLoading && !isError && data?.items?.length === 0 && (
          <EmptyState title="Không tìm thấy sản phẩm phù hợp" description="Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm." />
        )}

        {data?.items?.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="flex justify-center pt-4">
              <PageControls
                page={data.pagination?.page ?? params.page}
                totalPages={data.pagination?.totalPages ?? 1}
                onPageChange={(page) => updateParams({ page })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
