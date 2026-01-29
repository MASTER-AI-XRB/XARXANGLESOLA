export type ProductWithUser = {
  id: string
  name: string
  description: string | null
  images: string
  reserved: boolean
  reservedById: string | null
  prestec: boolean
  createdAt: Date
  user: { nickname: string | null }
  reservedBy?: { nickname: string | null } | null
  _count?: { favorites: number }
}

export const mapProduct = (product: ProductWithUser) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  images: JSON.parse(product.images),
  reserved: product.reserved,
  reservedBy: product.reserved && product.reservedBy
    ? { nickname: product.reservedBy.nickname ?? '' }
    : null,
  prestec: product.prestec,
  createdAt: product.createdAt,
  user: { nickname: product.user.nickname ?? '' },
  favoritesCount: product._count?.favorites ?? 0,
})
