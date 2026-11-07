import requests
import os
import json

rubro_cover_map = {
    "Pizzería": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    "Verdulería": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "Almacén": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "Panadería": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
    "Carnicería": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800",
    "Fiambrería": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?w=800",
    "Kiosco": "https://images.unsplash.com/photo-1534723328310-584dad0300c2?w=800",
    "Dietética": "https://images.unsplash.com/photo-1506368083636-6defb4b0e8f7?w=800",
    "Supermercado": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800",
    "Rotisería": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"
}

# Descargar imágenes de portada
for rubro, url in rubro_cover_map.items():
    filename = f"{rubro.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')}_cover.jpg"
    filepath = os.path.join("data/images/", filename)
    print(f"Descargando portada {rubro}...")
    response = requests.get(url)
    with open(filepath, 'wb') as f:
        f.write(response.content)

# Leer users.json y actualizar
with open('seed/users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

for u in users:
    for rubro in rubro_cover_map.keys():
        if rubro in u['businessName']:
            filename = f"{rubro.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')}_cover.jpg"
            u['imagenPortada'] = filename
            u['galeria'] = json.dumps([filename])

with open('seed/users.json', 'w', encoding='utf-8') as f:
    json.dump(users, f, indent=2, ensure_ascii=False)
