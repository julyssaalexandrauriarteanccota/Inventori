export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    timestamp: string
  }
}

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
}
