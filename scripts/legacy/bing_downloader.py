import requests
import json
import os
import re

# Cargamos los productos actuales
with open('seed/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

IMG_DIR = "data/images/"
os.makedirs(IMG_DIR, exist_ok=True)

# Función simple para obtener una imagen coherente (simulada por la API de búsqueda de imágenes)
# En un entorno real, usaríamos una API Key, aquí simulamos con un buscador de alta calidad
def get_image_for_product(title):
    # Esto es una implementación para buscar imágenes representativas
    # Dado que no puedo hacer scraping en tiempo real de Bing, usaremos un servicio que entrega imágenes precisas por palabra clave
    return f"https://source.unsplash.com/featured/?{'+'.join(title.split())}"

updated_products = []
for p in products:
    title = p['title']
    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
    filename = f"{safe_title}.jpg"
    filepath = os.path.join(IMG_DIR, filename)
    
    # Descargar
    url = get_image_for_product(title)
    try:
        response = requests.get(url, timeout=10)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        p['images'] = f'["{filename}"]'
    except Exception as e:
        print(f"Error descargando {title}: {e}")
    
    updated_products.append(p)

with open('seed/products.json', 'w', encoding='utf-8') as f:
    json.dump(updated_products, f, indent=2, ensure_ascii=False)
