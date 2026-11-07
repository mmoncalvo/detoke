import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { whatsappLink, BASE_URL } from '@/lib/api';
import { X } from 'lucide-react';

export default function Checkout() {
  const { items, updateQuantity, removeFromCart, removeBusinessFromCart, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('checkout_addresses');
    return saved ? JSON.parse(saved) : {};
  });
  const [payments, setPayments] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('checkout_payments');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('checkout_addresses', JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem('checkout_payments', JSON.stringify(payments));
  }, [payments]);
  
  // Agrupar items por negocio
  const groupedItems = items.reduce((acc: any, item) => {
    if (!acc[item.userId]) acc[item.userId] = { 
        businessName: item.businessName, 
        whatsapp: item.whatsapp, 
        slug: item.slug, 
        items: [] 
    };
    acc[item.userId].items.push(item);
    return acc;
  }, {});

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/data/images/${path}`;
  };

  const handleSendOrder = (userId: string, business: any) => {
    let message = "Hola! Pedido para " + business.businessName + ":\n\n";
    let subtotal = 0;
    business.items.forEach((item: any) => {
      const itemSubtotal = item.price * item.quantity;
      message += "> " + item.title + " x" + item.quantity + "\n";
      message += "  $" + item.price.toFixed(2) + " c/u = $" + itemSubtotal.toFixed(2) + "\n";
      subtotal += itemSubtotal;
    });
    message += "\n--------------------\n";
    message += "Total: $" + subtotal.toFixed(2);
    message += "\n--------------------\n";
    
    if (addresses[userId]) {
        message += "Direccion: " + addresses[userId] + "\n";
    }
    
    if (payments[userId]) {
        message += "--------------------\n";
        message += "Pago con tarjeta\n";
    }
    
    window.open(whatsappLink(business.whatsapp, message), '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pt-24 pb-8 px-4">
      <main className="max-w-2xl mx-auto">
        {/* Aviso de múltiples carritos */}
        {Object.keys(groupedItems).length > 1 && (
          <div className="mb-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
            <span className="text-2xl">🛍️</span>
            <p className="text-sm font-medium">Estás realizando pedidos a <b>{Object.keys(groupedItems).length} locales diferentes</b>. Cada uno se enviará por separado.</p>
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 tracking-tight">Tu pedido</h1>
        
        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center shadow-sm border border-gray-50 dark:border-gray-800/50">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">Tu carrito está vacío</p>
            <a href="/explorar" className="inline-block bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition">
              Volver a explorar
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([userId, business]: [string, any]) => (
              <div key={userId} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-6 md:p-8 space-y-6 border border-gray-50 dark:border-gray-800/50 relative">
                <button 
                  onClick={() => removeBusinessFromCart(userId)}
                  className="absolute top-6 right-6 p-2 bg-black/5 hover:bg-black/10 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 rounded-full transition"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 border-b border-gray-50 dark:border-gray-800/50 pb-4">
                    <Link to={`/negocio/${business.slug}`} className="hover:underline">
                        {business.businessName}
                    </Link>
                </h2>
                <div className="space-y-4">
                  {business.items.map((item: any) => {
                    const images = JSON.parse(item.images || '[]');
                    const img = images.length > 0 ? images[0] : null;
                    return (
                      <div key={item.id} className="flex items-center gap-4">
                        <img src={getImageUrl(img) || ''} alt={item.title} className="w-16 h-16 rounded-xl object-cover bg-gray-100 dark:bg-gray-800" />
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-full px-1 py-1 border border-gray-200 dark:border-gray-700">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                            className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 transition"
                          >-</button>
                          <span className="font-bold w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                            className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 transition"
                          >+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-500">✕</button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="pt-4 space-y-3">
                    <input 
                        type="text" 
                        placeholder="Dirección (opcional)" 
                        value={addresses[userId] || ''}
                        onChange={(e) => setAddresses(prev => ({...prev, [userId]: e.target.value}))}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                    <hr className="border-gray-100 dark:border-gray-800" />
                    <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition">
                        <div className="relative flex items-center">
                            <input 
                                type="checkbox" 
                                checked={!!payments[userId]}
                                onChange={(e) => setPayments(prev => ({...prev, [userId]: e.target.checked}))}
                                className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-lg checked:bg-emerald-500 checked:border-emerald-500 transition duration-200"
                            />
                            <svg className="absolute w-3.5 h-3.5 text-white left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pago con tarjeta</span>
                    </label>
                </div>

                <button 
                  onClick={() => handleSendOrder(userId, business)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition"
                >
                  Pedir a {business.businessName} por WhatsApp
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
