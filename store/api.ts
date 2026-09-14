import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** Backend root without trailing /api */
export const API_ROOT = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
).replace(/\/api\/?$/, '');

const CACHE_SEC = 5 * 60; // keep unused data 5 minutes
const STALE_SEC = 120; // don't refetch on remount if data < 2 min old

function authHeader() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_ROOT,
    prepareHeaders: (headers) => {
      const h = authHeader() as Record<string, string>;
      if (h.Authorization) headers.set('Authorization', h.Authorization);
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  keepUnusedDataFor: CACHE_SEC,
  refetchOnMountOrArgChange: STALE_SEC,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: [
    'Me',
    'Users',
    'Products',
    'Categories',
    'Subcategories',
    'Orders',
    'TodaySales',
    'Inventory',
    'CreditCustomers',
    'CreditCustomer',
    'Vendors',
    'Vendor',
  ],
  endpoints: (builder) => ({
    getMe: builder.query<{ user: { id: string; name: string; email: string; role: string } }, void>({
      query: () => '/me',
      providesTags: ['Me'],
      keepUnusedDataFor: 15 * 60,
    }),

    getUsers: builder.query<any[], void>({
      query: () => '/api/users',
      transformResponse: (res: any) => res?.users ?? res?.data ?? [],
      providesTags: ['Users'],
    }),

    updateUser: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    deleteUser: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),

    getProducts: builder.query<any[], void>({
      query: () => '/api/products',
      transformResponse: (res: any) => res?.data ?? [],
      providesTags: ['Products'],
    }),

    createProduct: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: '/api/product/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products', 'Inventory'],
    }),

    updateProduct: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/product/update/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Products', 'Inventory'],
    }),

    deleteProduct: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/product/delete/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products', 'Inventory'],
    }),

    restockProduct: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/product/restock/${id}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products', 'Inventory'],
    }),

    getCategories: builder.query<any[], void>({
      query: () => '/api/categories',
      transformResponse: (res: any) => res?.data ?? [],
      providesTags: ['Categories'],
    }),

    createCategory: builder.mutation<any, { name: string }>({
      query: (body) => ({
        url: '/api/category/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Categories'],
    }),

    getSubcategories: builder.query<any[], string>({
      query: (categoryId) => `/api/subcategories/category/${categoryId}`,
      transformResponse: (res: any) => res?.data ?? [],
      providesTags: (_r, _e, categoryId) => [{ type: 'Subcategories', id: categoryId }],
    }),

    createSubcategory: builder.mutation<any, { name: string; category: string }>({
      query: (body) => ({
        url: '/api/subcategory/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        'Subcategories',
        { type: 'Subcategories', id: arg.category },
      ],
    }),

    getOrders: builder.query<any[], void>({
      query: () => '/api/orders/all',
      transformResponse: (res: any) => res?.data ?? [],
      providesTags: ['Orders'],
    }),

    updateOrderStatus: builder.mutation<any, { id: string; status: string; paymentStatus?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/orders/${id}/status`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Orders', 'TodaySales'],
    }),

    getTodaySales: builder.query<any, void>({
      query: () => '/api/orders/reports/today',
      transformResponse: (res: any) => res?.data ?? null,
      providesTags: ['TodaySales'],
      // fresher for sales desk, but still cached
      keepUnusedDataFor: 60,
    }),

    createOrder: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: '/api/orders/create',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders', 'TodaySales', 'Products', 'Inventory', 'CreditCustomers', 'CreditCustomer'],
    }),

    getInventory: builder.query<{ data: any[]; summary: any }, string | void>({
      query: (q) => `/api/products/inventory${q || ''}`,
      transformResponse: (res: any) => ({
        data: res?.data ?? [],
        summary: res?.summary ?? {},
      }),
      providesTags: ['Inventory'],
    }),

    getCreditCustomers: builder.query<{ data: any[]; summary: any }, string | void>({
      query: (q) => {
        const qs = q && String(q).trim() ? `?q=${encodeURIComponent(String(q).trim())}` : '';
        return `/api/credit/customers${qs}`;
      },
      transformResponse: (res: any) => ({
        data: res?.data ?? [],
        summary: res?.summary ?? {},
      }),
      providesTags: ['CreditCustomers'],
    }),

    getCreditCustomer: builder.query<{ customer: any; ledger: any[] }, string>({
      query: (id) => `/api/credit/customers/${id}`,
      transformResponse: (res: any) => ({
        customer: res?.data?.customer ?? null,
        ledger: res?.data?.ledger ?? [],
      }),
      providesTags: (_r, _e, id) => [{ type: 'CreditCustomer', id }, 'CreditCustomers'],
    }),

    createCreditCustomer: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: '/api/credit/customers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CreditCustomers'],
    }),

    updateCreditCustomer: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/credit/customers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        'CreditCustomers',
        { type: 'CreditCustomer', id: arg.id },
      ],
    }),

    deleteCreditCustomer: builder.mutation<any, { id: string; force?: boolean }>({
      query: ({ id, force }) => ({
        url: `/api/credit/customers/${id}${force ? '?force=1' : ''}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CreditCustomers'],
    }),

    addCreditSale: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/credit/customers/${id}/sale`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        'CreditCustomers',
        { type: 'CreditCustomer', id: arg.id },
        'Products',
        'Inventory',
      ],
    }),

    addCreditPayment: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/credit/customers/${id}/payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        'CreditCustomers',
        { type: 'CreditCustomer', id: arg.id },
      ],
    }),

    deleteCreditLedger: builder.mutation<any, { entryId: string; customerId?: string }>({
      query: ({ entryId }) => ({
        url: `/api/credit/ledger/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        'CreditCustomers',
        ...(arg.customerId ? [{ type: 'CreditCustomer' as const, id: arg.customerId }] : []),
        'Products',
        'Inventory',
      ],
    }),

    getVendors: builder.query<{ data: any[]; summary: any }, string | void>({
      query: (q) => {
        const qs = q && String(q).trim() ? `?q=${encodeURIComponent(String(q).trim())}` : '';
        return `/api/vendors${qs}`;
      },
      transformResponse: (res: any) => ({
        data: res?.data ?? [],
        summary: res?.summary ?? {},
      }),
      providesTags: ['Vendors'],
    }),

    getVendor: builder.query<{ vendor: any; ledger: any[] }, string>({
      query: (id) => `/api/vendors/${id}`,
      transformResponse: (res: any) => ({
        vendor: res?.data?.vendor ?? null,
        ledger: res?.data?.ledger ?? [],
      }),
      providesTags: (_r, _e, id) => [{ type: 'Vendor', id }, 'Vendors'],
    }),

    createVendor: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: '/api/vendors', method: 'POST', body }),
      invalidatesTags: ['Vendors'],
    }),

    updateVendor: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/api/vendors/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => ['Vendors', { type: 'Vendor', id: arg.id }],
    }),

    deleteVendor: builder.mutation<any, { id: string; force?: boolean }>({
      query: ({ id, force }) => ({
        url: `/api/vendors/${id}${force ? '?force=1' : ''}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Vendors'],
    }),

    addVendorPurchase: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/vendors/${id}/purchase`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => ['Vendors', { type: 'Vendor', id: arg.id }],
    }),

    addVendorPayment: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/vendors/${id}/payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => ['Vendors', { type: 'Vendor', id: arg.id }],
    }),

    addVendorAdvance: builder.mutation<any, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/api/vendors/${id}/advance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => ['Vendors', { type: 'Vendor', id: arg.id }],
    }),

    deleteVendorLedger: builder.mutation<any, { entryId: string; vendorId?: string }>({
      query: ({ entryId }) => ({
        url: `/api/vendors/ledger/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        'Vendors',
        ...(arg.vendorId ? [{ type: 'Vendor' as const, id: arg.vendorId }] : []),
      ],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useRestockProductMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetSubcategoriesQuery,
  useCreateSubcategoryMutation,
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetTodaySalesQuery,
  useCreateOrderMutation,
  useGetInventoryQuery,
  useGetCreditCustomersQuery,
  useGetCreditCustomerQuery,
  useCreateCreditCustomerMutation,
  useUpdateCreditCustomerMutation,
  useDeleteCreditCustomerMutation,
  useAddCreditSaleMutation,
  useAddCreditPaymentMutation,
  useDeleteCreditLedgerMutation,
  useGetVendorsQuery,
  useGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useAddVendorPurchaseMutation,
  useAddVendorPaymentMutation,
  useAddVendorAdvanceMutation,
  useDeleteVendorLedgerMutation,
  useLazyGetTodaySalesQuery,
  useLazyGetCreditCustomersQuery,
  usePrefetch,
} = adminApi;
