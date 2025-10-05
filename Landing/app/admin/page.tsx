import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AdminDashboard() {
  const [productCount, categoryCount, visibleProducts, featuredProducts] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.product.count({ where: { visible: true } }),
    prisma.product.count({ where: { featured: true } }),
  ])

  const recentProducts = await prisma.product.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      category: true,
      images: {
        take: 1,
        orderBy: { order: 'asc' }
      }
    }
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display tracking-tight mb-2">Dashboard</h1>
        <p className="text-neutral-600">Welcome to EME Estudio admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Products" value={productCount} icon="🎨" />
        <StatCard title="Visible Products" value={visibleProducts} icon="👁️" />
        <StatCard title="Featured" value={featuredProducts} icon="⭐" />
        <StatCard title="Categories" value={categoryCount} icon="📁" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-sm shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products/new"
            className="px-6 py-3 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
          >
            + New Product
          </Link>
          <Link
            href="/admin/categories"
            className="px-6 py-3 bg-neutral-800 text-white rounded-sm hover:opacity-90 transition-opacity"
          >
            Manage Categories
          </Link>
          <Link
            href="/admin/content"
            className="px-6 py-3 border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
          >
            Edit Content
          </Link>
          <Link
            href="/"
            target="_blank"
            className="px-6 py-3 border border-neutral-300 rounded-sm hover:bg-neutral-50 transition-colors"
          >
            View Site →
          </Link>
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-sm shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Products</h2>
          <Link
            href="/admin/products"
            className="text-accent hover:underline text-sm"
          >
            View all →
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="mb-4">No products yet</p>
            <Link
              href="/admin/products/new"
              className="inline-block px-6 py-2 bg-accent text-white rounded-sm hover:opacity-90 transition-opacity"
            >
              Create your first product
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentProducts.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}/edit`}
                className="flex items-center gap-4 p-3 rounded-sm hover:bg-neutral-50 transition-colors border border-neutral-200"
              >
                {product.images[0] ? (
                  <img
                    src={product.images[0].thumbnail_url}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-sm"
                  />
                ) : (
                  <div className="w-16 h-16 bg-neutral-200 rounded-sm flex items-center justify-center">
                    <span className="text-neutral-400 text-2xl">🎨</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{product.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-neutral-600">
                    {product.category && (
                      <span className="px-2 py-0.5 bg-neutral-100 rounded-sm">
                        {product.category.name}
                      </span>
                    )}
                    {product.featured && <span>⭐ Featured</span>}
                    {!product.visible && <span className="text-orange-600">📦 Draft</span>}
                  </div>
                </div>
                <span className="text-neutral-400">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-sm shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neutral-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <span className="text-4xl opacity-50">{icon}</span>
      </div>
    </div>
  )
}
