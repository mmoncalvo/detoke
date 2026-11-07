import json

rubro_data = {
    "Pizzería": {
        "cat": "cat-1", "cover": "don-juan-cover.jpg", "prefix": "piz",
        "business_names": ["La Trattoria del Nonno", "Pizzería La Muzzarella", "Napoli Express", "Pizza & Co.", "El Horno de Barro", "Mundo Pizza"],
        "prods": [("Pizza Mozzarella Especial", "pizza_mozzarella.jpg"), ("Pizza Napolitana Gourmet", "pizza_napolitana.jpg"), ("Pizza Especial", "pizza_especial.jpg"), ("Fugazzeta", "pizza_mozza.jpg"), ("Calzone Artesanal", "pizza_mozza.jpg"), ("Empanadas de Carne", "empanadas.jpg"), ("Fainá Casera", "pizza_napolitana.jpg"), ("Bebida Cola", "coca.jpg")]
    },
    "Verdulería": {
        "cat": "cat-6", "cover": "verduleria-cover.jpg", "prefix": "verd",
        "business_names": ["Don Pepe", "Frutas Frescas", "Verde Vida", "El Rincón del Campo", "La Huerta", "Campo y Sol"],
        "prods": [("Manzanas Rojas", "manzanas.jpg"), ("Lechuga Fresca", "lechuga.jpg"), ("Bananas", "bananas.jpg"), ("Tomates Cherry", "tomates.jpg"), ("Zanahorias", "lechuga.jpg"), ("Papas Blancas", "lechuga.jpg"), ("Cebollas", "lechuga.jpg"), ("Limones", "tomates.jpg")]
    },
    "Almacén": {
        "cat": "cat-2", "cover": "almacen-cover.jpg", "prefix": "alm",
        "business_names": ["El Ahorro", "Despensa Doña Rosa", "Mercadito Express", "Almacén Central", "Todo Suelto", "El Sol de la Esquina"],
        "prods": [("Arroz Premium", "arroz.jpg"), ("Aceite de Oliva", "aceite.jpg"), ("Fideos Tirabuzón", "fideos.jpg"), ("Lentejas", "lentejas.jpg"), ("Yerba Mate", "arroz.jpg"), ("Azúcar", "arroz.jpg"), ("Harina 000", "arroz.jpg"), ("Sal Fina", "arroz.jpg")]
    },
    "Panadería": {
        "cat": "cat-4", "cover": "facturas.jpg", "prefix": "pan",
        "business_names": ["El Trigito", "Pan y Manteca", "La Artesanal", "Dulces Sueños", "Panadería Central", "El Horno"],
        "prods": [("Facturas Mixtas", "facturas.jpg"), ("Pan Francés", "pan-frances.jpg"), ("Medialunas", "medialunas.jpg"), ("Pan Integral", "pan-frances.jpg"), ("Bizcochos", "pan-frances.jpg"), ("Torta Chocolate", "facturas.jpg"), ("Pre-pizza", "pizza-napolitana.jpg"), ("Donas", "facturas.jpg")]
    },
    "Carnicería": {
        "cat": "cat-5", "cover": "asado.jpg", "prefix": "carne",
        "business_names": ["El Buen Corte", "Carnes Argentinas", "El Estanciero", "La Selecta", "Carnicería Real", "Don Carnicero"],
        "prods": [("Asado de Tira", "asado.jpg"), ("Milanesas de Pollo", "milanesas.jpg"), ("Hamburguesas de Carne", "hamburguesas_de_carne.jpg"), ("Chorizo de Cerdo", "asado.jpg"), ("Vacío", "asado.jpg"), ("Matambre", "asado.jpg"), ("Peceto", "asado.jpg"), ("Carne Picada", "hamburguesas_de_carne.jpg")]
    },
    "Fiambrería": {
        "cat": "cat-7", "cover": "queso.jpg", "prefix": "fiam",
        "business_names": ["Delicias", "El Rey del Queso", "La Fiambrería", "Tabla de Sabores", "Don Fiambre", "Gourmet"],
        "prods": [("Queso Tybo", "queso.jpg"), ("Jamón Cocido", "queso.jpg"), ("Salame", "queso.jpg"), ("Queso Roquefort", "queso.jpg"), ("Mortadela", "queso.jpg"), ("Paleta", "queso.jpg"), ("Bondiola", "queso.jpg"), ("Queso Untable", "queso.jpg")]
    },
    "Kiosco": {
        "cat": "cat-3", "cover": "coca.jpg", "prefix": "kio",
        "business_names": ["24hs Abierto", "El Kiosquito", "La Esquina", "Punto Dulce", "Kiosco Central", "Parada 1"],
        "prods": [("Coca Cola 1.5L", "coca.jpg"), ("Jugo de Naranja", "jugo.jpg"), ("Agua Mineral", "agua.jpg"), ("Cerveza Lata", "coca.jpg"), ("Sprite", "coca.jpg"), ("Agua Saborizada", "agua.jpg"), ("Vino Malbec", "coca.jpg"), ("Soda", "agua.jpg")]
    },
    "Dietética": {
        "cat": "cat-2", "cover": "lentejas.jpg", "prefix": "diet",
        "business_names": ["Vida Sana", "Naturalmente", "Dietética Orgánica", "Puro Bienestar", "Equilibrio", "Semilla Vital"],
        "prods": [("Lentejas Secas", "lentejas.jpg"), ("Almendras", "lentejas.jpg"), ("Nueces Peladas", "lentejas.jpg"), ("Granola", "lentejas.jpg"), ("Semillas Chía", "lentejas.jpg"), ("Harina Almendras", "lentejas.jpg"), ("Miel Pura", "lentejas.jpg"), ("Stevia", "lentejas.jpg")]
    },
    "Supermercado": {
        "cat": "cat-8", "cover": "jabon.jpg", "prefix": "super",
        "business_names": ["Super Express", "Todo Todo", "Hiper Mercado", "Super El Sol", "Tu Barrio", "Gran Bazar"],
        "prods": [("Jabón Líquido", "jabon.jpg"), ("Papel Higiénico", "papel.jpg"), ("Detergente", "jabon.jpg"), ("Esponjas", "jabon.jpg"), ("Shampoo", "jabon.jpg"), ("Pasta Dental", "jabon.jpg"), ("Lavandina", "jabon.jpg"), ("Desodorante Spray", "jabon.jpg")]
    },
    "Rotisería": {
        "cat": "cat-1", "cover": "empanadas.jpg", "prefix": "roti",
        "business_names": ["Del Barrio", "Cocina Casera", "Sabor de Casa", "La Rotisería", "Para Llevar", "El Sabor del Día"],
        "prods": [("Empanadas de Pollo", "empanadas.jpg"), ("Pizza Napolitana", "pizza_napolitana.jpg"), ("Sandwich de Milanesa", "hamburguesa.jpg"), ("Pollo al Horno", "asado.jpg"), ("Ensalada Rusa", "tomates.jpg"), ("Tortilla de Papas", "empanadas.jpg"), ("Tarta de Verdura", "empanadas.jpg"), ("Milanesa de Soja", "hamburguesas_de_carne.jpg")]
    }
}

users = []
products = []

horario_abierto = json.dumps({
    "lunes": "09:00-20:00", "martes": "09:00-20:00", "miercoles": "09:00-20:00", 
    "jueves": "09:00-20:00", "viernes": "09:00-20:00", "sabado": "09:00-20:00", "domingo": "09:00-20:00"
})

for i, (name, data) in enumerate(rubro_data.items()):
    for j, bname in enumerate(data['business_names']):
        uid = f"v{i+1}-{j+1}"
        users.append({
            "id": uid,
            "username": f"{data['prefix']}{j+1}",
            "password": "password123",
            "role": "vendedor",
            "fullName": f"Dueño {bname}",
            "email": f"{data['prefix']}{j+1}@example.com",
            "businessName": bname,
            "slug": f"{data['prefix']}-{j+1}",
            "whatsapp": "5491112345678",
            "description": f"Bienvenidos a {bname}, tu lugar de confianza en {name}.",
            "address": "Av. Principal 123",
            "latitud": -34.6037, "longitud": -58.3816,
            "horario": horario_abierto,
            "imagenPortada": data['cover'],
            "galeria": f"[\"{data['cover']}\"]",
            "sitioWeb": "https://detoke.com",
            "estaVerificado": True
        })
        for k, (prod_name, img) in enumerate(data['prods']):
            products.append({
                "id": f"{uid}-p{k}",
                "title": prod_name,
                "slug": f"slug-{uid}-{k}",
                "description": f"El mejor/a {prod_name} de la zona.",
                "price": 1000 + (k * 200),
                "categoryId": data['cat'],
                "images": f"[\"{img}\"]",
                "userId": uid,
                "isAvailable": True
            })

with open('seed/users.json', 'w', encoding='utf-8') as f:
    json.dump(users, f, indent=2, ensure_ascii=False)
with open('seed/products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)
