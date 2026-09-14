'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import PhoneSheet from '@/components/PhoneSheet';
import {
  API_ROOT,
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
  useCreateCategoryMutation,
  useCreateSubcategoryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '@/store/api';

type Category = { _id: string; name?: string };
type Subcategory = { _id: string; name?: string };
type Size = { _id?: string; name?: string; id?: string; productId?: string; label?: string; value?: string };
type Product = {
  _id: string;
  name: string;
  price: number;
  purchasePrice?: number;
  stock?: number;
  minimumQuantity?: number;
  supportsOpenSale?: boolean;
  supportsPacketSale?: boolean;
  openRate?: number | null;
  openRateUnit?: string;
  packetPrice?: number | null;
  packetSize?: number | null;
  packetSizeUnit?: string;
  category?: Category | string;
  subcategory?: Subcategory | string;
  description?: string;
  images?: string[];
  sizes?: Size[];
  material?: string;
  brand?: string;
  unit?: string;
  status?: string;
};

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function getImageUrl(img: string) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const path = img.startsWith('/') ? img : `/uploads/${img}`;
  return `${API_ROOT}${path}`;
}

function getName(obj: { name?: string } | string | undefined) {
  if (!obj) return '';
  return typeof obj === 'object' && obj && 'name' in obj ? obj.name : String(obj || '');
}

function getStockAlert(p: Product) {
  const stock = p.stock ?? 0;
  const min = p.minimumQuantity ?? 0;
  if (stock === 0) return { level: 'out' as const, label: 'Out of stock' };
  if (min > 0 && stock < min) return { level: 'low' as const, label: 'Low stock' };
  return null;
}

export default function ProductsPage() {
  const { data: products = [], isLoading: loading } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [modal, setModal] = useState<'add' | Product | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '0',
    minimumQuantity: '0',
    supportsOpenSale: false,
    supportsPacketSale: true,
    openRate: '',
    openRateUnit: 'kg',
    packetPrice: '',
    packetSize: '',
    packetSizeUnit: 'piece',
    category: '',
    subcategory: '',
    images: '',
    sizes: '',
    material: '',
    brand: '',
    unit: 'piece',
    status: 'active',
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);

  const [createCategoryMut] = useCreateCategoryMutation();
  const [createSubcategoryMut] = useCreateSubcategoryMutation();
  const [createProductMut] = useCreateProductMutation();
  const [updateProductMut] = useUpdateProductMutation();
  const [deleteProductMut] = useDeleteProductMutation();

  const subQueryId = modal ? form.category : filterCategory;
  const { data: subcategories = [] } = useGetSubcategoriesQuery(subQueryId, {
    skip: !subQueryId,
  });

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setCreatingCat(true);
    try {
      await createCategoryMut({ name: categoryName.trim() }).unwrap();
      setCategoryName('');
    } catch (err: any) {
      alert(err?.data?.message || err?.data?.error || 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  }

  async function createSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!subcategoryName.trim() || !subcategoryCategoryId) return;
    setCreatingSub(true);
    try {
      await createSubcategoryMut({
        name: subcategoryName.trim(),
        category: subcategoryCategoryId,
      }).unwrap();
      setSubcategoryName('');
      setSubcategoryCategoryId('');
    } catch (err: any) {
      alert(err?.data?.message || err?.data?.error || 'Failed to create subcategory');
    } finally {
      setCreatingSub(false);
    }
  }

  function openAdd() {
    const catId = (categories as Category[])[0]?._id || '';
    setForm({
      name: '', description: '', price: '', purchasePrice: '', stock: '0', minimumQuantity: '0',
      supportsOpenSale: false, supportsPacketSale: true, openRate: '', openRateUnit: 'kg',
      packetPrice: '', packetSize: '', packetSizeUnit: 'piece',
      category: catId, subcategory: '',
      images: '', sizes: '', material: '', brand: '', unit: 'piece', status: 'active',
    });
    setModal('add');
  }

  async function openEdit(p: Product) {
    const catId = typeof p.category === 'object' && p.category ? (p.category as Category)._id : (p.category as string) || '';
    const subId = typeof p.subcategory === 'object' && p.subcategory ? (p.subcategory as Subcategory)._id : (p.subcategory as string) || '';
    const sizesStr = p.sizes?.map((s) => (s as Size).name || (s as { size?: string }).size || (s as Size).label || '').filter(Boolean).join(', ') || '';
    const imagesStr = Array.isArray(p.images) ? p.images.join('\n') : '';
    setForm({
      name: p.name, description: p.description || '', price: String(p.price), purchasePrice: String(p.purchasePrice ?? 0), stock: String(p.stock ?? 0), minimumQuantity: String(p.minimumQuantity ?? 0),
      supportsOpenSale: Boolean(p.supportsOpenSale),
      supportsPacketSale: p.supportsPacketSale !== false,
      openRate: p.openRate != null ? String(p.openRate) : '',
      openRateUnit: p.openRateUnit || 'kg',
      packetPrice: p.packetPrice != null ? String(p.packetPrice) : '',
      packetSize: p.packetSize != null ? String(p.packetSize) : '',
      packetSizeUnit: p.packetSizeUnit || p.unit || 'piece',
      category: catId, subcategory: subId,
      images: imagesStr, sizes: sizesStr, material: p.material || '', brand: p.brand || '', unit: p.unit || 'piece', status: p.status || 'active',
    });
    setModal(p);
  }

  function onFormCategoryChange(catId: string) {
    setForm((prev) => ({ ...prev, category: catId, subcategory: '' }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const images = form.images ? form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [];
    const sizeNames = form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const sizes = sizeNames.map((name, i) => {
      const existing = modal && modal !== 'add' ? (modal as Product).sizes?.[i] : undefined;
      return {
        name,
        id: (existing as Size)?.id ?? `size_${Date.now()}_${i}`,
        productId: modal && modal !== 'add' ? (modal as Product)._id : null,
      };
    });
    const body: Record<string, unknown> = {
      name: form.name,
      price: parseFloat(form.price),
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      category: form.category || undefined,
      description: form.description || undefined,
      stock: parseInt(form.stock) || 0,
      minimumQuantity: parseInt(form.minimumQuantity) || 0,
      material: form.material || undefined,
      brand: form.brand || undefined,
      unit: form.unit || 'piece',
      status: form.status || 'active',
      supportsOpenSale: form.supportsOpenSale,
      supportsPacketSale: form.supportsPacketSale,
    };
    if (form.openRate) body.openRate = parseFloat(form.openRate);
    if (form.openRateUnit) body.openRateUnit = form.openRateUnit;
    if (form.packetPrice) body.packetPrice = parseFloat(form.packetPrice);
    if (form.packetSize) body.packetSize = parseFloat(form.packetSize);
    if (form.packetSizeUnit) body.packetSizeUnit = form.packetSizeUnit;
    if (form.subcategory) body.subcategory = form.subcategory;
    if (images.length) body.images = images;
    if (sizes.length) body.sizes = sizes;
    try {
      if (modal === 'add') {
        await createProductMut(body).unwrap();
      } else if (modal) {
        await updateProductMut({ id: modal._id, body }).unwrap();
      }
      setModal(null);
    } catch {
      alert('Failed to save');
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteProductMut(id).unwrap();
    } catch {
      alert('Delete failed');
    }
  }

  const productList = products as Product[];
  const categoryList = categories as Category[];
  const subcategoryList = subcategories as Subcategory[];

  const filtered = productList.filter((p) => {
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (getName(p.category) || '').toLowerCase().includes(search.toLowerCase()) || (getName(p.subcategory) || '').toLowerCase().includes(search.toLowerCase());
    const catId = typeof p.category === 'object' && p.category ? (p.category as Category)._id : (p.category as string);
    const subId = typeof p.subcategory === 'object' && p.subcategory ? (p.subcategory as Subcategory)._id : (p.subcategory as string);
    const matchCat = !filterCategory || catId === filterCategory;
    const matchSub = !filterSubcategory || subId === filterSubcategory;
    return matchSearch && matchCat && matchSub;
  });

  const lowStockProducts = productList.filter((p) => getStockAlert(p)?.level === 'low');
  const outOfStockProducts = productList.filter((p) => getStockAlert(p)?.level === 'out');

  if (loading && !productList.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-3 sm:py-2 border rounded-lg w-full sm:w-48 text-base" />
            <button onClick={openAdd} className="w-full sm:w-auto px-4 py-2.5 bg-primary-600 text-white rounded-lg">Add Product</button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
          <div className="min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }} className="w-full sm:w-auto px-3 py-3 sm:py-2 border rounded-lg min-w-0 sm:min-w-[140px] text-base">
              <option value="">All</option>
              {categoryList.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Subcategory</label>
            <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} className="w-full sm:w-auto px-3 py-3 sm:py-2 border rounded-lg min-w-0 sm:min-w-[140px] text-base" disabled={!filterCategory}>
              <option value="">All</option>
              {subcategoryList.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <form onSubmit={createCategory} className="flex gap-2 items-center w-full sm:w-auto">
            <div className="w-full">
              <label className="block text-xs text-gray-500 mb-1">Create Category</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="px-3 py-3 sm:py-2 border rounded-lg w-full sm:min-w-[120px] text-base" placeholder="Name" required />
                <button type="submit" disabled={creatingCat} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg disabled:opacity-50 text-sm">{creatingCat ? '...' : 'Create'}</button>
              </div>
            </div>
          </form>
          <form onSubmit={createSubcategory} className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
            <div className="w-full">
              <label className="block text-xs text-gray-500 mb-1">Create Subcategory</label>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <select value={subcategoryCategoryId} onChange={(e) => setSubcategoryCategoryId(e.target.value)} className="px-3 py-3 sm:py-2 border rounded-lg w-full sm:min-w-[120px] text-base" required>
                  <option value="">Category</option>
                  {categoryList.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <input value={subcategoryName} onChange={(e) => setSubcategoryName(e.target.value)} className="px-3 py-3 sm:py-2 border rounded-lg w-full sm:min-w-[100px] text-base" placeholder="Name" required />
                <button type="submit" disabled={creatingSub || !subcategoryCategoryId} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg disabled:opacity-50 text-sm">{creatingSub ? '...' : 'Create'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-semibold text-amber-800 mb-2">Inventory alerts</p>
          <ul className="text-sm text-amber-900 space-y-1">
            {outOfStockProducts.map((p) => (
              <li key={p._id}>⚠ {p.name} — out of stock (0 left)</li>
            ))}
            {lowStockProducts.map((p) => (
              <li key={p._id}>⚠ {p.name} — low stock ({p.stock ?? 0} left, min {p.minimumQuantity ?? 0})</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const alert = getStockAlert(p);
          return (
          <div key={p._id} className={`bg-white rounded-lg shadow overflow-hidden ${alert ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
              {p.images?.length ? (
                <img src={getImageUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                {alert && (
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${alert.level === 'out' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {alert.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {getName(p.category)}
                {getName(p.subcategory) && ` › ${getName(p.subcategory)}`}
              </p>
              {p.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.description}</p>}
              {(p.material || p.brand) && (
                <p className="text-xs text-gray-400 mt-1">
                  {[p.material, p.brand].filter(Boolean).join(' • ')}
                </p>
              )}
              {p.sizes?.length ? (
                <p className="text-xs text-gray-500 mt-1">Sizes: {p.sizes.map((s) => (s as Size).name || (s as Size).label).filter(Boolean).join(', ')}</p>
              ) : null}
              <div className="flex justify-between items-center mt-2">
                <div>
                  <p className="text-lg font-bold text-primary-600">₹{p.packetPrice ?? p.price}</p>
                  {p.supportsOpenSale && p.openRate != null && (
                    <p className="text-xs text-gray-500">Open: ₹{p.openRate}/{p.openRateUnit || 'kg'}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">Stock: {p.stock ?? 0}{(p.minimumQuantity ?? 0) > 0 ? ` / min ${p.minimumQuantity}` : ''}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                {(alert?.level === 'out' || alert?.level === 'low') && (
                  <Link href="/admin/restock" className="w-full sm:flex-1 py-2.5 bg-green-100 text-green-800 rounded text-sm text-center">Stock In</Link>
                )}
                <button onClick={() => openEdit(p)} className="w-full sm:flex-1 py-2.5 bg-primary-100 text-primary-700 rounded text-sm">Edit</button>
                <button onClick={() => del(p._id)} className="w-full sm:flex-1 py-2.5 bg-red-100 text-red-700 rounded text-sm">Delete</button>
              </div>
            </div>
          </div>
        );})}
      </div>
      {filtered.length === 0 && <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No products</div>}

      {modal && (
        <PhoneSheet
          title={modal === 'add' ? 'Add Product' : 'Edit Product'}
          wide
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModal(null)} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button type="submit" form="product-form" className="py-3 bg-primary-600 text-white rounded-xl text-base">
                Save
              </button>
            </div>
          }
        >
          <form id="product-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Selling price (default / packet) *</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Purchase price</label>
                <input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="Cost per unit" />
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-gray-50 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Open (loose) &amp; Packet rates</p>
              <p className="text-xs text-gray-500">For items like nails — set both open (kg/100g) and packet rates</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.supportsOpenSale} onChange={(e) => setForm({ ...form, supportsOpenSale: e.target.checked })} />
                  Sell open / loose
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.supportsPacketSale} onChange={(e) => setForm({ ...form, supportsPacketSale: e.target.checked })} />
                  Sell as packet
                </label>
              </div>
              {form.supportsOpenSale && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Open rate (₹)</label>
                    <input type="number" step="0.01" min="0" value={form.openRate} onChange={(e) => setForm({ ...form, openRate: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="e.g. 200" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Rate unit</label>
                    <select value={form.openRateUnit} onChange={(e) => setForm({ ...form, openRateUnit: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base">
                      <option value="kg">per 1 kg</option>
                      <option value="100g">per 100 g</option>
                      <option value="g">per 1 g</option>
                      <option value="piece">per piece</option>
                    </select>
                  </div>
                </div>
              )}
              {form.supportsPacketSale && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Packet rate (₹)</label>
                    <input type="number" step="0.01" min="0" value={form.packetPrice} onChange={(e) => setForm({ ...form, packetPrice: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder={form.price || 'Same as selling price'} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">1 packet equals (optional)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" min="0" value={form.packetSize} onChange={(e) => setForm({ ...form, packetSize: e.target.value })} className="flex-1 px-3 py-3 border rounded-xl text-base" placeholder="1" />
                      <select value={form.packetSizeUnit} onChange={(e) => setForm({ ...form, packetSizeUnit: e.target.value })} className="px-2 py-3 border rounded-xl text-base">
                        <option value="piece">piece</option>
                        <option value="kg">kg</option>
                        <option value="100g">100g</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {form.price && form.purchasePrice && (
              <p className="text-xs text-gray-500 -mt-2">Purchase rate set — profit shows on <Link href="/admin/sales" className="text-primary-600 underline">Today&apos;s Sales</Link></p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" />
              </div>
              <div>
                <label className="block text-sm mb-1">Minimum quantity</label>
                <input type="number" min="0" value={form.minimumQuantity} onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="Low stock alert" />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Category *</label>
              <select value={form.category} onChange={(e) => onFormCategoryChange(e.target.value)} className="w-full px-3 py-3 border rounded-xl text-base" required>
                <option value="">Select</option>
                {categoryList.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Subcategory</label>
              <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" disabled={!form.category}>
                <option value="">Select (optional)</option>
                {subcategoryList.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Images</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={async (ev) => {
                    const files = ev.target.files;
                    if (!files?.length) return;
                    setUploading(true);
                    try {
                      const fd = new FormData();
                      for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
                      const token = getToken();
                      const uploadHeaders: Record<string, string> = {};
                      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
                      const res = await fetch(`${API_ROOT}/api/upload?folder=products`, { method: 'POST', headers: uploadHeaders, body: fd });
                      const data = await res.json();
                      if (data?.urls?.length) {
                        const newUrls = data.urls.map((u: string) => (u.startsWith('http') ? u : `${API_ROOT}${u.startsWith('/') ? '' : '/'}${u}`));
                        const existing = form.images ? form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [];
                        setForm({ ...form, images: [...existing, ...newUrls].join('\n') });
                      } else {
                        alert(data?.details || data?.error || 'Upload failed');
                      }
                    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed'); } finally { setUploading(false); ev.target.value = ''; }
                  }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full sm:w-auto px-4 py-3 border rounded-xl bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-sm">
                    {uploading ? 'Uploading...' : 'Select Photos'}
                  </button>
                </div>
                <textarea value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" rows={2} placeholder="Or paste URLs (one per line)" />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Sizes (comma-separated, e.g. 500 gm, 1 kg)</label>
              <input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="500 gm, 1 kg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Material</label>
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="e.g. Adhesive, Brass" />
              </div>
              <div>
                <label className="block text-sm mb-1">Brand</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="e.g. Fevicol" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base">
                  <option value="piece">piece</option>
                  <option value="bottle">bottle</option>
                  <option value="kg">kg</option>
                  <option value="sheet">sheet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-3 border rounded-xl text-base">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
          </form>
        </PhoneSheet>
      )}
    </div>
  );
}
