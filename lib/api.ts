import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('admin_token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export const endpoints = {
  login: '/login',
  users: '/users',
  user: (id: string) => `/users/${id}`,
  products: '/products',
  product: (id: string) => `/product/${id}`,
  createProduct: '/product/create',
  updateProduct: (id: string) => `/product/update/${id}`,
  deleteProduct: (id: string) => `/product/delete/${id}`,
  categories: '/categories',
  orders: '/orders/all',
  order: (id: string) => `/orders/${id}`,
  orderStatus: (id: string) => `/orders/${id}/status`,
};
