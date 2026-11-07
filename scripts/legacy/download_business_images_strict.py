import requests
import os
import json

rubro_data = {
    "Pizzería": {"url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800", "filename": "pizzeria_cover.jpg"},
    "Verdulería": {"url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", "filename": "verdulería_cover.jpg"},
    "Almacén": {"url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", "filename": "almacen_cover.jpg"},
    "Panadería": {"url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800", "filename": "panaderia_cover.jpg"},
    "Carnicería": {"url": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800", "filename": "carniceria_cover.jpg"},
    "Fiambrería": {"url": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?w=800", "filename": "fiambreria_cover.jpg"},
    "Kiosco": {"url": "https://images.unsplash.com/photo-1534723328310-584dad0300c2?w=800", "filename": "kiosco_cover.jpg"},
    "Dietética": {"url": "https://images.unsplash.com/photo-1506368083636-6defb4b0e8f7?w=800", "filename": "dietetica_cover.jpg"},
    "Supermercado": {"url": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800", "filename": "supermercado_cover.jpg"},
    "Rotisería": {"url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", "filename": "rotiseria_cover.jpg"}
}

IMG_DIR = "data/images/"
os.makedirs(IMG_DIR, exist_ok=True)

# Descargar y validar
for rubro, data in rubro_data.items():
    filepath = os.path.join(IMG_DIR, data['filename'])
    print(f"Descargando {data['filename']}...")
    try:
        response = requests.get(data['url'], timeout=10)
        # Verificar que sea una imagen real y no un error HTML
        if response.status_code == 200 and 'image' in response.headers.get('Content-Type', ''):
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Descarga exitosa: {data['filename']}")
        else:
            print(f"Error descargando {data['filename']}: status {response.status_code}")
    except Exception as e:
        print(f"Excepción descargando {data['filename']}: {e}")

# Actualizar el seed
with open('seed/users.json', 'r', encoding='utf-8') as f:
    users = json.load(f)

for u in users:
    for rubro, data in rubro_data.items():
        if rubro in u['businessName']:
            u['imagenPortada'] = data['filename']
            u['galeria'] = json.dumps([data['filename']])

with open('seed/users.json', 'w', encoding='utf-8') as f:
    json.dump(users, f, indent=2, ensure_ascii=False)
