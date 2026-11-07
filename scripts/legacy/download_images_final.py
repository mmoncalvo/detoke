import requests
import os
import json

# Mapeo de productos a imágenes reales de alta calidad (URLs directas de Unsplash)
product_images = {
    "pizza_mozzarella.jpg": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=500",
    "pizza_napolitana.jpg": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=500",
    "pizza_especial.jpg": "https://images.unsplash.com/photo-1590947132387-155ca02f7253?auto=format&fit=crop&q=80&w=500",
    "empanadas.jpg": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=500",
    "hamburguesas_de_carne.jpg": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=500",
    "manzanas.jpg": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=500",
    "lechuga.jpg": "https://images.unsplash.com/photo-1622206151226-18ca2c581074?auto=format&fit=crop&q=80&w=500",
    "bananas.jpg": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=500",
    "tomates.jpg": "https://images.unsplash.com/photo-1592924357228-9564da86a73a?auto=format&fit=crop&q=80&w=500",
    "arroz.jpg": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=500",
    "aceite.jpg": "https://images.unsplash.com/photo-1474979266404-7ea3cbd97955?auto=format&fit=crop&q=80&w=500",
    "fideos.jpg": "https://images.unsplash.com/photo-1612203852033-a363b8a36f73?auto=format&fit=crop&q=80&w=500",
    "lentejas.jpg": "https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&q=80&w=500",
    "facturas.jpg": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=500",
    "pan_frances.jpg": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=500",
    "medialunas.jpg": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=500",
    "asado.jpg": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=500",
    "milanesas.jpg": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=500",
    "queso.jpg": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?auto=format&fit=crop&q=80&w=500",
    "coca.jpg": "https://images.unsplash.com/photo-1624517452488-048c1304e2ca?auto=format&fit=crop&q=80&w=500",
    "jugo.jpg": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=500",
    "agua.jpg": "https://images.unsplash.com/photo-1548848283-7de877995f54?auto=format&fit=crop&q=80&w=500",
    "jabon.jpg": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "papel.jpg": "https://images.unsplash.com/photo-1605335552230-6725287f3e46?w=500",
    "hamburguesa.jpg": "https://images.unsplash.com/photo-1528735602780-2552fd46c7ab?w=500"
}

IMG_DIR = "data/images/"

for filename, url in product_images.items():
    filepath = os.path.join(IMG_DIR, filename)
    print(f"Descargando {filename}...")
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
        else:
            print(f"Error {response.status_code} para {filename}")
    except Exception as e:
        print(f"Error descargando {filename}: {e}")
