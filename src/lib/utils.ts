import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the full URL for an avatar image
 * @param avatarPath - Avatar path from API (can be '/profile/filename' or 'filename')
 * @returns Full URL to the avatar image
 */
export function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null
  
  // Normalize avatar path
  let normalizedPath = avatarPath
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/profile/${normalizedPath}`
  }
  
  // Get base URL without /api
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://torchlight.africa/api').replace('/api', '')
  
  return `${baseUrl}/storage${normalizedPath}`
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Round monetary values to cents (2 dp) for stable display and comparisons. */
export function roundMoney(amount: number, decimals = 2): number {
  if (!Number.isFinite(amount)) return 0
  const factor = 10 ** decimals
  return Math.round((amount + Number.EPSILON) * factor) / factor
}

/** Compare payment/credit amounts without float noise (e.g. 1 vs 0.999999999). */
export function amountExceedsMax(amount: number, max: number): boolean {
  return roundMoney(amount) > roundMoney(max)
}

export function formatMoney(amount: number, decimals = 2): string {
  return roundMoney(amount, decimals).toFixed(decimals)
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}
