export const MAX_CUSTOMS_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024

export function validateCustomsDocumentFile(file: File): string | null {
  if (file.size > MAX_CUSTOMS_DOCUMENT_SIZE_BYTES) {
    return `File must not exceed 2 MB. "${file.name}" is too large.`
  }
  return null
}
