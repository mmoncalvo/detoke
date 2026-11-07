import json
import uuid

rubros = [
    {"name": "Pizzería", "cat": "cat-1", "images": "pizza-mozza.jpg", "prefix": "piz"},
    {"name": "Verdulería", "cat": "cat-6", "images": "manzanas.jpg", "prefix": "verd"},
    {"name": "Almacén", "cat": "cat-2", "images": "arroz.jpg", "prefix": "alm"},
    {"name": "Panadería", "cat": "cat-4", "images": "pan-frances.jpg", "prefix": "pan"},
    {"name": "Carnicería", "cat": "cat-5", "images": "asado.jpg", "prefix": "carne"},
    {"name": "Fiambrería", "cat": "cat-7", "images": "queso.jpg", "prefix": "fiam"},
    {"name": "Kiosco", "cat": "cat-3", "images": "coca.jpg", "prefix": "kio"},
    {"name": "Dietética", "cat": "cat-2", "images": "lentejas.jpg", "prefix": "diet"},
    {"name": "Supermercado", "cat": "cat-8", "images": "jabon.jpg", "prefix": "super"},
    {"name": "Rotisería", "cat": "cat-1", "images": "empanadas.jpg", "prefix": "roti"}
]

users = []
products = []

for i, rubro in enumerate(rubros):
    for j in range(6):
        uid = f"v{i+1}-{j+1}"
        users.append({
            "id": uid,
            "username": f"{rubro['prefix']}{j+1}",
            "password": "password123",
            "role": "vendedor",
            "fullName": f"Dueño {rubro['name']} {j+1}",
            "email": f"{rubro['prefix']}{j+1}@ejemplo.com",
            "businessName": f"{rubro['name']} {j+1}",
            "slug": f"{rubro['prefix']}-{j+1}",
            "whatsapp": "5491112345678",
            "description": f"El mejor {rubro['name']} de la ciudad.",
            "address": "Av. Test 123",
            "latitud": -34.6037, "longitud": -58.3816,
            "horario": "{\"lunes\":\"09:00-20:00\"}",
            "imagenPortada": rubro['images'],
            "galeria": f"[\"{rubro['images']}\"]",
            "sitioWeb": "",
            "estaVerificado": True
        })
        for k in range(8):
            products.append({
                "id": f"{uid}-prod-{k}",
                "title": f"Producto {rubro['prefix']} {k+1}",
                "slug": f"prod-{uid}-{k}",
                "description": "Producto de alta calidad",
                "price": 1000 + (k * 100),
                "categoryId": rubro['cat'],
                "images": f"[\"{rubro['images']}\"]",
                "userId": uid,
                "isAvailable": True
            })

with open('seed/users.json', 'w') as f:
    json.dump(users, f, indent=2)
with open('seed/products.json', 'w') as f:
    json.dump(products, f, indent=2)
