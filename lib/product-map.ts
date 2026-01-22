export type ProductWithUser = {
  id: string
  name: string
  description: string | null
  images: string
  reserved: boolean
  prestec: boolean
  createdAt: Date
  user: { nickname: string }
}

export const mapProduct = (product: ProductWithUser) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  images: JSON.parse(product.images),
  reserved: product.reserved,
  prestec: product.prestec,
  createdAt: product.createdAt,
  user: { nickname: product.user.nickname },
})
