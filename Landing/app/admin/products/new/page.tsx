import { ProductForm } from "@/components/admin/ProductForm"

export default function NewProductPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display tracking-tight mb-2">New Product</h1>
          <p className="text-neutral-600">Add a new item to your portfolio</p>
        </div>

        <div className="bg-white rounded-sm shadow-sm p-6">
          <ProductForm />
        </div>
      </div>
    </div>
  )
}
