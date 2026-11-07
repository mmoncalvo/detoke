import requests
import os
import json

# Directorio de destino
IMG_DIR = "data/images/"
os.makedirs(IMG_DIR, exist_ok=True)

# Mapeo de términos de búsqueda a imágenes (simulando búsqueda real)
products_map = {
    "Pizza Mozzarella": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500",
    "Pizza Napolitana": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500",
    "Pizza Especial": "https://images.unsplash.com/photo-1590947132387-155ca02f7253?w=500",
    "Fugazzeta": "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=500",
    "Calzone": "https://images.unsplash.com/photo-1614707267637-08703080084f?w=500",
    "Empanadas de Carne": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500",
    "Fainá": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500",
    "Bebida Cola": "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500",
    "Manzanas Rojas": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500",
    "Lechuga Fresca": "https://images.unsplash.com/photo-1622206151226-18ca2c581074?w=500",
    "Bananas": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500",
    "Tomates Cherry": "https://images.unsplash.com/photo-1592924357228-9564da86a73a?w=500",
    "Arroz Premium": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500",
    "Aceite de Oliva": "https://images.unsplash.com/photo-1474979266404-7ea3cbd97955?w=500",
    "Fideos Tirabuzón": "https://images.unsplash.com/photo-1612203852033-a363b8a36f73?w=500",
    "Lentejas": "https://images.unsplash.com/photo-1584824486516-0555a07fc511?w=500",
    "Facturas Mixtas": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    "Pan Francés": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500",
    "Medialunas": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500",
    "Asado de Tira": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500",
    "Milanesas de Pollo": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500",
    "Hamburguesas de Carne": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    "Chorizo de Cerdo": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=500"
}

for name, url in products_map.items():
    filename = name.lower().replace(" ", "_") + ".jpg"
    filepath = os.path.join(IMG_DIR, filename)
    print(f"Descargando {name}...")
    response = requests.get(url)
    with open(filepath, 'wb') as f:
        f.write(response.content)
