'use client';

import { useEffect, useRef, useState } from 'react';

type Category = { _id: string; name?: string };
type Subcategory = { _id: string; name?: string };
type Size = { _id?: string; name?: string; id?: string; productId?: string; label?: string; value?: string };
type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-jc8p.onrender.com/api').replace(/\/api\/?$/, '');

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function getImageUrl(img: string) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const path = img.startsWith('/') ? img : `/uploads/${img}`;
  return `${API_BASE}${path}`;
}

function getName(obj: { name?: string } | string | undefined) {
  if (!obj) return '';
  return typeof obj === 'object' && obj && 'name' in obj ? obj.name : String(obj || '');
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [modal, setModal] = useState<'add' | Product | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '0',
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

  async function load() {
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [pRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`, { headers }),
        fetch(`${API_BASE}/api/categories`, { headers }),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      setProducts(pData?.data ?? []);
      setCategories(cData?.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadSubcategories(categoryId: string) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/subcategories/category/${categoryId}`, { headers });
      const data = await res.json();
      setSubcategories(data?.data ?? data?.subcategories ?? []);
    } catch {
      setSubcategories([]);
    }
  }

  useEffect(() => {
    loadSubcategories(filterCategory);
    setFilterSubcategory('');
  }, [filterCategory]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setCreatingCat(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/category/create`, { method: 'POST', headers, body: JSON.stringify({ name: categoryName.trim() }) });
      const data = await res.json();
      if (res.ok && data) {
        setCategoryName('');
        load();
      } else {
        alert(data?.message || data?.error || 'Failed to create category');
      }
    } catch {
      alert('Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  }

  async function createSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!subcategoryName.trim() || !subcategoryCategoryId) return;
    setCreatingSub(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/subcategory/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: subcategoryName.trim(), category: subcategoryCategoryId }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setSubcategoryName('');
        setSubcategoryCategoryId('');
        load();
        if (filterCategory) loadSubcategories(filterCategory);
      } else {
        alert(data?.message || data?.error || 'Failed to create subcategory');
      }
    } catch {
      alert('Failed to create subcategory');
    } finally {
      setCreatingSub(false);
    }
  }

  function openAdd() {
    const catId = categories[0]?._id || '';
    setForm({
      name: '', description: '', price: '', stock: '0', category: catId, subcategory: '',
      images: '', sizes: '', material: '', brand: '', unit: 'piece', status: 'active',
    });
    setModal('add');
    if (catId) loadSubcategories(catId);
  }

  async function openEdit(p: Product) {
    const catId = typeof p.category === 'object' && p.category ? (p.category as Category)._id : (p.category as string) || '';
    const subId = typeof p.subcategory === 'object' && p.subcategory ? (p.subcategory as Subcategory)._id : (p.subcategory as string) || '';
    const sizesStr = p.sizes?.map((s) => (s as Size).name || (s as { size?: string }).size || (s as Size).label || '').filter(Boolean).join(', ') || '';
    const imagesStr = Array.isArray(p.images) ? p.images.join('\n') : '';
    setForm({
      name: p.name, description: p.description || '', price: String(p.price), stock: String(p.stock ?? 0), category: catId, subcategory: subId,
      images: imagesStr, sizes: sizesStr, material: p.material || '', brand: p.brand || '', unit: p.unit || 'piece', status: p.status || 'active',
    });
    setModal(p);
    if (catId) await loadSubcategories(catId);
  }

  function onFormCategoryChange(catId: string) {
    setForm((prev) => ({ ...prev, category: catId, subcategory: '' }));
    loadSubcategories(catId);
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
      category: form.category || undefined,
      description: form.description || undefined,
      stock: parseInt(form.stock) || 0,
      material: form.material || undefined,
      brand: form.brand || undefined,
      unit: form.unit || 'piece',
      status: form.status || 'active',
    };
    if (form.subcategory) body.subcategory = form.subcategory;
    if (images.length) body.images = images;
    if (sizes.length) body.sizes = sizes;
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (modal === 'add') {
        await fetch(`${API_BASE}/api/product/create`, { method: 'POST', headers, body: JSON.stringify(body) });
      } else if (modal) {
        await fetch(`${API_BASE}/api/product/update/${modal._id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      }
      setModal(null);
      load();
    } catch {
      alert('Failed to save');
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/api/product/delete/${id}`, { method: 'DELETE', headers });
      load();
    } catch {
      alert('Delete failed');
    }
  }

  const filtered = products.filter((p) => {
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (getName(p.category) || '').toLowerCase().includes(search.toLowerCase()) || (getName(p.subcategory) || '').toLowerCase().includes(search.toLowerCase());
    const catId = typeof p.category === 'object' && p.category ? (p.category as Category)._id : (p.category as string);
    const subId = typeof p.subcategory === 'object' && p.subcategory ? (p.subcategory as Subcategory)._id : (p.subcategory as string);
    const matchCat = !filterCategory || catId === filterCategory;
    const matchSub = !filterSubcategory || subId === filterSubcategory;
    return matchSearch && matchCat && matchSub;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="flex gap-2">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border rounded-lg flex-1 sm:w-48" />
            <button onClick={openAdd} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add Product</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border rounded-lg min-w-[140px]">
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subcategory</label>
            <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} className="px-3 py-2 border rounded-lg min-w-[140px]" disabled={!filterCategory}>
              <option value="">All</option>
              {subcategories.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <form onSubmit={createCategory} className="flex gap-2 items-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Create Category</label>
              <div className="flex gap-2">
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="px-3 py-2 border rounded-lg min-w-[120px]" placeholder="Name" required />
                <button type="submit" disabled={creatingCat} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 text-sm">{creatingCat ? '...' : 'Create'}</button>
              </div>
            </div>
          </form>
          <form onSubmit={createSubcategory} className="flex gap-2 items-center flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Create Subcategory</label>
              <div className="flex gap-2 flex-wrap">
                <select value={subcategoryCategoryId} onChange={(e) => setSubcategoryCategoryId(e.target.value)} className="px-3 py-2 border rounded-lg min-w-[120px]" required>
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <input value={subcategoryName} onChange={(e) => setSubcategoryName(e.target.value)} className="px-3 py-2 border rounded-lg min-w-[100px]" placeholder="Name" required />
                <button type="submit" disabled={creatingSub || !subcategoryCategoryId} className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 text-sm">{creatingSub ? '...' : 'Create'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p._id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
              {p.images?.length ? (
                <img src={getImageUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{p.name}</h3>
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
                <p className="text-lg font-bold text-primary-600">₹{p.price}</p>
                <span className="text-sm text-gray-500">Stock: {p.stock ?? 0}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(p)} className="flex-1 py-2 bg-primary-100 text-primary-700 rounded text-sm">Edit</button>
                <button onClick={() => del(p._id)} className="flex-1 py-2 bg-red-100 text-red-700 rounded text-sm">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No products</div>}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Price *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Category *</label>
                <select value={form.category} onChange={(e) => onFormCategoryChange(e.target.value)} className="w-full px-3 py-2 border rounded" required>
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Subcategory</label>
                <select value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} className="w-full px-3 py-2 border rounded" disabled={!form.category}>
                  <option value="">Select (optional)</option>
                  {subcategories.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Images</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      setUploading(true);
                      try {
                        const fd = new FormData();
                        for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
                        const res = await fetch('/api/upload', { method: 'POST', body: fd });
                        const data = await res.json();
                        if (data?.urls?.length) {
                          const base = typeof window !== 'undefined' ? window.location.origin : '';
                          const newUrls = data.urls.map((u: string) => (u.startsWith('http') ? u : base + u));
                          const existing = form.images ? form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [];
                          setForm({ ...form, images: [...existing, ...newUrls].join('\n') });
                        }
                      } catch { alert('Upload failed'); } finally { setUploading(false); e.target.value = ''; }
                    }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2 border rounded bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-sm">
                      {uploading ? 'Uploading...' : '📁 Select Photos'}
                    </button>
                  </div>
                  <textarea value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" rows={2} placeholder="Or paste URLs (one per line)" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Sizes (comma-separated, e.g. 500 gm, 1 kg)</label>
                <input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="500 gm, 1 kg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Material</label>
                  <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g. Adhesive, Brass" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Brand</label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="e.g. Fevicol" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="piece">piece</option>
                    <option value="bottle">bottle</option>
                    <option value="kg">kg</option>
                    <option value="sheet">sheet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 border rounded">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
