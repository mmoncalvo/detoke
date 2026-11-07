import json

rubro_data = {
    "Pizzería": {
        "cat": "cat-1", "cover": "don-juan-cover.jpg", "prefix": "piz",
        "business_names": ["La Trattoria del Nonno", "Pizzería La Muzzarella", "Napoli Express", "Pizza & Co.", "El Horno de Barro", "Mundo Pizza"],
        "prods": [
            ("Pizza Muzzarella Especial", "pizza_mozzarella.jpg"), ("Pizza Napolitana Gourmet", "pizza_napolitana.jpg"), 
            ("Pizza Fugazzeta Rellena", "pizza_mozza.jpg"), ("Calzone Artesanal", "pizza_mozza.jpg"), 
            ("Empanadas de Carne Cortada a Cuchillo", "empanadas.jpg"), ("Fainá Casera", "pizza_napolitana.jpg"), 
            ("Pizza de Rúcula y Jamón Crudo", "pizza_especial.jpg"), ("Pizza 4 Quesos", "pizza_mozza.jpg")
        ]
    },
    "Verdulería": {
        "cat": "cat-6", "cover": "verduleria-cover.jpg", "prefix": "verd",
        "business_names": ["Verdulería Don Pepe", "Frutas y Verduras Frescas", "La Huerta del Barrio", "El Rincón Verde", "Frutillitas", "Campo y Sol"],
        "prods": [
            ("Manzanas Gala Orgánicas", "manzanas.jpg"), ("Lechuga Criolla Hidropónica", "lechuga.jpg"), 
            ("Bananas Premium", "bananas.jpg"), ("Tomates Cherry de la Huerta", "tomates.jpg"), 
            ("Zanahorias Baby", "lechuga.jpg"), ("Papas Negras Selección", "lechuga.jpg"), 
            ("Cebollas Moradas", "lechuga.jpg"), ("Limones de Campo", "tomates.jpg")
        ]
    },
    "Almacén": {
        "cat": "cat-2", "cover": "almacen-cover.jpg", "prefix": "alm",
        "business_names": ["Almacén El Ahorro", "Despensa Doña Rosa", "Mercadito Express", "Almacén Central", "Todo Suelto", "El Sol de la Esquina"],
        "prods": [
            ("Arroz Doble Carolina", "arroz.jpg"), ("Aceite de Oliva Extra Virgen", "aceite.jpg"), 
            ("Fideos Tirabuzón al Huevo", "fideos.jpg"), ("Lentejas Secas Premium", "lentejas.jpg"), 
            ("Yerba Mate Orgánica", "arroz.jpg"), ("Azúcar Rubia", "arroz.jpg"), 
            ("Harina Integral 000", "arroz.jpg"), ("Sal Marina Fina", "arroz.jpg")
        ]
    },
    "Panadería": {
        "cat": "cat-4", "cover": "facturas.jpg", "prefix": "pan",
        "business_names": ["Panadería El Trigito", "Pan y Manteca", "La Artesanal de Ana", "Dulces Sueños", "Panadería Selecta", "El Horno del Rey"],
        "prods": [
            ("Facturas de Manteca", "facturas.jpg"), ("Pan de Campo Artesanal", "pan-frances.jpg"), 
            ("Medialunas Dulces", "medialunas.jpg"), ("Pan Multicereales", "pan-frances.jpg"), 
            ("Bizcochos de Grasa Caseros", "pan-frances.jpg"), ("Torta Húmeda de Chocolate", "facturas.jpg"), 
            ("Pre-pizza con Tomate", "pizza-napolitana.jpg"), ("Donas Glaseadas", "facturas.jpg")
        ]
    },
    "Carnicería": {
        "cat": "cat-5", "cover": "asado.jpg", "prefix": "carne",
        "business_names": ["El Buen Corte", "Carnes Argentinas Premium", "El Estanciero", "La Selecta Carnes", "Carnicería Real", "Don Carnicero"],
        "prods": [
            ("Asado de Tira Especial", "asado.jpg"), ("Milanesas de Pollo Rebozadas", "milanesas.jpg"), 
            ("Hamburguesas Vacunas Caseras", "hamburguesas_de_carne.jpg"), ("Chorizos Artesanales de Cerdo", "asado.jpg"), 
            ("Vacío al Vacío", "asado.jpg"), ("Matambre de Cerdo", "asado.jpg"), 
            ("Peceto seleccionado", "asado.jpg"), ("Carne Picada Especial", "hamburguesas_de_carne.jpg")
        ]
    },
    "Fiambrería": {
        "cat": "cat-7", "cover": "queso.jpg", "prefix": "fiam",
        "business_names": ["Delicias del Fiambre", "El Rey del Queso", "La Fiambrería Gourmet", "Tabla de Sabores", "Don Fiambre y Queso", "Punto Gourmet"],
        "prods": [
            ("Queso Tybo Feteado", "queso.jpg"), ("Jamón Cocido Superior", "queso.jpg"), 
            ("Salame Tipo Milán", "queso.jpg"), ("Queso Azul Roquefort", "queso.jpg"), 
            ("Mortadela Boloñesa", "queso.jpg"), ("Paleta Cocida", "queso.jpg"), 
            ("Bondiola Curada", "queso.jpg"), ("Queso Untable Crema", "queso.jpg")
        ]
    },
    "Kiosco": {
        "cat": "cat-3", "cover": "coca.jpg", "prefix": "kio",
        "business_names": ["Kiosco 24hs", "El Kiosquito de la Esquina", "La Estación Kiosko", "Punto Dulce", "Kiosco Central", "Parada 1"],
        "prods": [
            ("Coca Cola Original 1.5L", "coca.jpg"), ("Jugo Natural de Naranja", "jugo.jpg"), 
            ("Agua Mineral Sin Gas", "agua.jpg"), ("Cerveza Lata Artesanal", "coca.jpg"), 
            ("Sprite Lima-Limón", "coca.jpg"), ("Agua Saborizada Frutal", "agua.jpg"), 
            ("Vino Malbec Reservado", "coca.jpg"), ("Soda en Sifón", "agua.jpg")
        ]
    },
    "Dietética": {
        "cat": "cat-2", "cover": "lentejas.jpg", "prefix": "diet",
        "business_names": ["Vida Sana Orgánica", "Punto Natural", "Dietética Vital", "Equilibrio Saludable", "Semilla y Fruto", "BioMarket"],
        "prods": [
            ("Lentejas Orgánicas", "lentejas.jpg"), ("Almendras Tostadas", "lentejas.jpg"), 
            ("Nueces Mariposa", "lentejas.jpg"), ("Granola con Frutos Secos", "lentejas.jpg"), 
            ("Semillas de Chía Premium", "lentejas.jpg"), ("Harina de Almendras", "lentejas.jpg"), 
            ("Miel de Abeja Pura", "lentejas.jpg"), ("Endulzante Stevia", "lentejas.jpg")
        ]
    },
    "Supermercado": {
        "cat": "cat-8", "cover": "jabon.jpg", "prefix": "super",
        "business_names": ["Super Express del Centro", "Mercado Todo Todo", "Hiper Mercado del Barrio", "Super El Sol", "Tu Super Amigo", "Gran Bazar"],
        "prods": [
            ("Jabón Líquido Antibacterial", "jabon.jpg"), ("Papel Higiénico Hoja Doble", "papel.jpg"), 
            ("Detergente Concentrado", "jabon.jpg"), ("Esponjas Multiuso", "jabon.jpg"), 
            ("Shampoo Reparación Total", "jabon.jpg"), ("Pasta Dental Protección", "jabon.jpg"), 
            ("Lavandina Perfumada", "jabon.jpg"), ("Desodorante en Spray", "jabon.jpg")
        ]
    },
    "Rotisería": {
        "cat": "cat-1", "cover": "empanadas.jpg", "prefix": "roti",
        "business_names": ["El Sabor del Barrio", "Cocina Casera de Mamá", "Rotisería del Buen Gusto", "Para Llevar Express", "El Rincón de la Comida", "Sabor Auténtico"],
        "prods": [
            ("Empanadas de Pollo Caseras", "empanadas.jpg"), ("Pizza Napolitana Artesanal", "pizza_napolitana.jpg"), 
            ("Sandwich de Milanesa Completo", "hamburguesa.jpg"), ("Pollo al Horno con Papas", "asado.jpg"), 
            ("Ensalada Rusa Fresca", "tomates.jpg"), ("Tortilla de Papas a la Española", "empanadas.jpg"), 
            ("Tarta de Verdura y Queso", "empanadas.jpg"), ("Milanesa de Soja Vegetariana", "hamburguesas_de_carne.jpg")
        ]
    }
}

users = []
products = []

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
            "description": f"Bienvenidos a {bname}, donde la calidad en {name} es nuestra prioridad.",
            "address": "Av. Principal 123",
            "latitud": -34.6037, "longitud": -58.3816,
            "horario": "{\"lunes\":\"09:00-20:00\"}",
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
