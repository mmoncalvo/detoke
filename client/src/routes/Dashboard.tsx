import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, BASE_URL } from '@/lib/api';
import PhoneInput from 'react-phone-input-2';
import { toast } from 'sonner';
import 'react-phone-input-2/lib/style.css';

interface Product { id: string; title: string; price: number; isAvailable: boolean; images: string; description?: string; categoryId?: string; Category?: { id: string; name: string; icon: string } }
interface Category { id: string; name: string; icon: string }


const DAYS = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout, login } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', categoryId: '', isAvailable: true });
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    businessName: user?.businessName || '',
    description: user?.description || '',
    whatsapp: user?.whatsapp || '',
    address: user?.address || '',
    sitioWeb: user?.sitioWeb || ''
  });
  const [businessHours, setBusinessHours] = useState<Record<string, { isOpen: boolean, open: string, close: string }>>({});
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(user?.imagenPortada ? user.imagenPortada : null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  const safeParseGallery = (galeria: any): string[] => {
    if (!galeria) return [];
    if (Array.isArray(galeria)) return galeria;
    try {
      return JSON.parse(galeria);
    } catch (e) {
      console.error('Error parsing gallery:', e);
      return [];
    }
  };

  const [galleryImages, setGalleryImages] = useState<string[]>(safeParseGallery(user?.galeria));
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<FileList | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const parseHorario = (horarioStr: string | undefined | null) => {
    const defaultHours: any = {};
    DAYS.forEach(day => { defaultHours[day.id] = { isOpen: false, open: '09:00', close: '18:00' }; });

    if (!horarioStr) return defaultHours;

    try {
      const parsed = JSON.parse(horarioStr);
      const hours: any = { ...defaultHours };
      Object.keys(parsed).forEach(day => {
        const val = parsed[day];
        if (val === 'cerrado' || val === 'Cerrado') {
          hours[day] = { ...hours[day], isOpen: false };
        } else if (typeof val === 'string' && val.includes('-')) {
          const [open, close] = val.split('-');
          hours[day] = { isOpen: true, open, close };
        }
      });
      return hours;
    } catch (e) {
      console.error('Error parsing horario:', e);
      return defaultHours;
    }
  };

  const formatHorario = (hours: Record<string, { isOpen: boolean, open: string, close: string }>) => {
    const result: any = {};
    Object.keys(hours).forEach(day => {
      result[day] = hours[day].isOpen ? `${hours[day].open}-${hours[day].close}` : 'cerrado';
    });
    return JSON.stringify(result);
  };

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:image')) return path;
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    // Si es solo un nombre de archivo, es una imagen de semilla (data/images)
    return `${BASE_URL}/data/images/${path}`;
  };

  const fetchProducts = async () => {
    if (user && token) {
      try {
        // Assuming there's an API endpoint to get products for the logged-in user
        // Or products are associated with the user's ID
        const res = await api.get(`/productos?userId=${user.id}`, token);
        setProducts(res.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categorias');
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Initialize image states and hours when user changes
    if (user?.imagenPortada) setCoverImagePreview(user.imagenPortada);
    setGalleryImages(safeParseGallery(user?.galeria));
    setBusinessHours(parseHorario(user?.horario));
  }, [user, token]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setSelectedGalleryFiles(files);
    if (files) {
      const previews: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === files.length) {
            setGalleryPreviews(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setGalleryPreviews([]);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let currentGallery = [...galleryImages];

      // Upload cover image if selected
      if (selectedCoverFile) {
        const formData = new FormData();
        formData.append('cover', selectedCoverFile);
        const res = await api.upload(`/usuarios/${user!.id}/upload-cover`, formData, token!);
        if (!res.success) throw new Error(res.error);
      }

      // Upload gallery images if selected
      if (selectedGalleryFiles && selectedGalleryFiles.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < selectedGalleryFiles.length; i++) {
          formData.append('gallery', selectedGalleryFiles[i]);
        }
        const res = await api.upload(`/usuarios/${user!.id}/upload-gallery`, formData, token!);
        if (!res.success) throw new Error(res.error);
        currentGallery = res.data.galeria; // Update with images returned from server
      }

      // Update profile data
      const payload = {
        ...profileForm,
        horario: formatHorario(businessHours),
        galeria: JSON.stringify(currentGallery),
      };

      const res = await api.put(`/usuarios/${user!.id}`, payload, token!);
      if (res.success) {
        setShowProfileForm(false);
        setSelectedCoverFile(null);
        setSelectedGalleryFiles(null);
        setGalleryPreviews([]);
        setCoverImagePreview(res.data.imagenPortada || null);
        setGalleryImages(res.data.galeria ? JSON.parse(res.data.galeria) : []);
        setBusinessHours(parseHorario(res.data.horario));
        login(token!, res.data);
        toast.success('Perfil actualizado correctamente');
      } else {
        throw new Error(res.error);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  const handleDeleteGalleryImage = async (imageUrlToDelete: string) => {
    toast('¿Eliminar esta imagen de la galería?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            const updatedGallery = galleryImages.filter(img => img !== imageUrlToDelete);
            const res = await api.put(`/usuarios/${user!.id}`, { galeria: JSON.stringify(updatedGallery) }, token!);
            if (res.success) {
              setGalleryImages(updatedGallery);
              toast.success('Imagen eliminada');
            } else {
              throw new Error(res.error);
            }
          } catch (error) {
            console.error('Error deleting gallery image:', error);
            toast.error('Error al eliminar imagen');
          }
        }
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form, price: parseFloat(form.price) };
      let productResponse;

      if (editing) {
        productResponse = await api.put(`/productos/${editing.id}`, payload, token!);
        if (!productResponse.success) throw new Error(JSON.stringify(productResponse.error));
        
        if (selectedFile) {
          const formData = new FormData();
          formData.append('image', selectedFile);
          const imgRes = await api.upload(`/productos/${editing.id}/upload-image`, formData, token!);
          if (!imgRes.success) throw new Error(JSON.stringify(imgRes.error));
        }
      } else {
        if (selectedFile) {
          const formData = new FormData();
          formData.append('title', form.title);
          formData.append('description', form.description);
          formData.append('price', String(parseFloat(form.price)));
          formData.append('categoryId', form.categoryId);
          formData.append('isAvailable', String(form.isAvailable));
          formData.append('image', selectedFile);
          productResponse = await api.upload('/productos', formData, token!);
        } else {
          // Asegurar tipos para el JSON
          const jsonPayload = {
            ...form,
            price: parseFloat(form.price),
            isAvailable: Boolean(form.isAvailable)
          };
          productResponse = await api.post('/productos', jsonPayload, token!);
        }
        if (!productResponse.success) throw new Error(JSON.stringify(productResponse.error));
      }

      // Reset form
      setShowForm(false);
      setEditing(null);
      setForm({ title: '', description: '', price: '', categoryId: '', isAvailable: true });
      setSelectedFile(null);
      setUploadPreview(null);
      
      // Fetch fresh data
      await fetchProducts();
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error('Error al guardar el producto');
    }
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || '', price: p.price.toString(), categoryId: p.categoryId || '', isAvailable: p.isAvailable });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    toast('¿Eliminar producto?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await api.delete(`/productos/${id}`, token!);
            fetchProducts();
            toast.success('Producto eliminado');
          } catch (e) {
            toast.error('Error al eliminar producto');
          }
        }
      }
    });
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pt-16">
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Dashboard</h1>
            {user?.businessName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.businessName}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to={`/negocio/${user?.slug || user?.id}`}
              target="_blank"
              className="text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <span>👁️</span> Ver mi página
            </Link>
            <button
              onClick={() => {
                setProfileForm({
                  businessName: user?.businessName || '',
                  description: user?.description || '',
                  whatsapp: user?.whatsapp || '',
                  address: user?.address || '',
                  sitioWeb: user?.sitioWeb || '' // Initialize with user's sitioWeb
                });
                setBusinessHours(parseHorario(user?.horario));
                setSelectedCoverFile(null); // Clear selected file on form open
                setCoverImagePreview(user?.imagenPortada || null); // Show current image
                setGalleryImages(safeParseGallery(user?.galeria)); // Load existing gallery
                setSelectedGalleryFiles(null);
                setGalleryPreviews([]);
                setShowProfileForm(true);
              }}
              className="text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl"
            >
              Editar Perfil
            </button>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Mis Productos</h2>
          <button
            onClick={() => { setEditing(null); setForm({ title: '', description: '', price: '', categoryId: '', isAvailable: true }); setShowForm(true); }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium"
          >
            + Nuevo Producto
          </button>
        </div>

        {showProfileForm && (
          <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg mb-6 space-y-4 border dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Editar Perfil</h2>

            <input
              name="businessName"
              type="text"
              placeholder="Nombre del negocio"
              value={profileForm.businessName}
              onChange={handleProfileChange}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required
            />

            <textarea
              name="description"
              placeholder="Descripción"
              value={profileForm.description}
              onChange={handleProfileChange}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={3}
            />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
            <PhoneInput
              country={'uy'}
              value={profileForm.whatsapp}
              onChange={(phone) => setProfileForm(prev => ({ ...prev, whatsapp: phone }))}
              inputClass="!w-full !px-4 !py-3 !border !rounded-xl !h-auto dark:!bg-gray-800 dark:!border-gray-700 dark:!text-white"
              containerClass="!w-full"
            />

            <input
              name="address"
              type="text"
              placeholder="Dirección"
              value={profileForm.address}
              onChange={handleProfileChange}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />

            <div className="space-y-3 border dark:border-gray-700 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Horarios de Atención</label>
              <div className="grid gap-3">
                {DAYS.map(day => (
                  <div key={day.id} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                    <span className="font-medium w-24 capitalize dark:text-gray-300">{day.label}</span>
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={businessHours[day.id]?.isOpen || false}
                          onChange={(e) => setBusinessHours(prev => ({
                            ...prev,
                            [day.id]: { ...prev[day.id], isOpen: e.target.checked }
                          }))}
                          className="rounded text-emerald-500"
                        />
                        <span className="text-sm dark:text-gray-300">{businessHours[day.id]?.isOpen ? 'Abierto' : 'Cerrado'}</span>
                      </label>

                      {businessHours[day.id]?.isOpen && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={businessHours[day.id]?.open || '09:00'}
                            onChange={(e) => setBusinessHours(prev => ({
                              ...prev,
                              [day.id]: { ...prev[day.id], open: e.target.value }
                            }))}
                            className="px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                          <span className="dark:text-gray-400">a</span>
                          <input
                            type="time"
                            value={businessHours[day.id]?.close || '18:00'}
                            onChange={(e) => setBusinessHours(prev => ({
                              ...prev,
                              [day.id]: { ...prev[day.id], close: e.target.value }
                            }))}
                            className="px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <input
              name="sitioWeb"
              type="url"
              placeholder="Sitio Web (ej: https://www.misitio.com)"
              value={profileForm.sitioWeb}
              onChange={handleProfileChange}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />

            {/* Cover image upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Imagen de portada</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="w-full px-4 py-3 border rounded-xl"
              />
              {coverImagePreview && (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                  <img
                    src={getImageUrl(coverImagePreview) || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Gallery image upload and display */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Galería de imágenes</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryFileChange}
                className="w-full px-4 py-3 border rounded-xl"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Existing Images */}
                {galleryImages.map((imgUrl, index) => (
                  <div key={`existing-${index}`} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                    <img src={getImageUrl(imgUrl) || ''} alt={`Gallery image ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryImage(imgUrl)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar imagen"
                    >
                      X
                    </button>
                  </div>
                ))}
                {/* New Previews */}
                {galleryPreviews.map((previewUrl, index) => (
                  <div key={`new-${index}`} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-500">
                    <img src={previewUrl} alt={`New preview ${index}`} className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-emerald-500 text-white text-[10px] px-1 rounded">NUEVA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            <div className="flex gap-3">
              <button type="submit" className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileForm(false);
                  setSelectedCoverFile(null);
                  setCoverImagePreview(user?.imagenPortada || null);
                  setGalleryImages(user?.galeria ? JSON.parse(user.galeria) : []); // Reset gallery
                  setSelectedGalleryFiles(null);
                  setGalleryPreviews([]);
                  setBusinessHours(parseHorario(user?.horario));
                }}
                className="bg-gray-100 px-6 py-2.5 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm mb-6 space-y-4 border dark:border-gray-800">
            <input
              type="text"
              placeholder="Título"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required
            />
            <textarea
              placeholder="Descripción"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={3}
            />
            <input
              type="number"
              placeholder="Precio"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              required
            />
            <select
              value={form.categoryId}
              onChange={e => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Sin categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            {/* Image upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del producto</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              {uploadPreview && (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                  <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={e => setForm({ ...form, isAvailable: e.target.checked })}
              />
              Disponible
            </label>
            <div className="flex gap-3">
              <button type="submit" className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium">
                {editing ? 'Guardar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); setSelectedFile(null); setUploadPreview(null); }}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => {
            const images = JSON.parse(p.images || '[]');
            const firstImage = images.length > 0 ? images[0] : null;
            return (
              <div key={p.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 flex gap-4 items-center">
                <img 
                  src={getImageUrl(firstImage) || ''} 
                  alt={p.title} 
                  className="w-20 h-20 rounded-xl object-cover bg-gray-100 dark:bg-gray-800"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{p.title}</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">${Number(p.price).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {p.Category && (
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        {p.Category.icon} {p.Category.name}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.isAvailable ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {p.isAvailable ? 'Disponible' : 'Agotado'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && !showForm && <p className="text-center text-gray-400 py-12">Aún no cargaste productos</p>}
      </main>
    </div>
  );
}
