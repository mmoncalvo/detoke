import os
import requests
import time
import json

# API KEY Pexels
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
IMAGE_DIR = "data/images"

def validate_image(filepath):
    # Validar existencia y tamaño mínimo
    if not os.path.exists(filepath): return False
    if os.path.getsize(filepath) < 15000: return False
    return True

def download_image(query, filename):
    headers = {"Authorization": PEXELS_API_KEY}
    # Buscamos con un query más rico para mejorar la calidad y relevancia
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=5"
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            photos = response.json().get('photos', [])
            for photo in photos:
                img_url = photo['src']['large']
                img_data = requests.get(img_url, timeout=15).content
                temp_filepath = os.path.join(IMAGE_DIR, f"temp_{filename}")
                with open(temp_filepath, 'wb') as f:
                    f.write(img_data)
                
                if validate_image(temp_filepath):
                    os.replace(temp_filepath, os.path.join(IMAGE_DIR, filename))
                    print(f"✓ Éxito: {filename} (Query: {query})")
                    return True
                else:
                    if os.path.exists(temp_filepath): os.remove(temp_filepath)
        return False
    except Exception as e:
        print(f"X Falló descarga para {query}: {e}")
        return False

# Cargar datos
with open('seed/products.json', 'r') as f:
    products = json.load(f)
with open('seed/users.json', 'r') as f:
    users = json.load(f)

def run_download():
    if not os.path.exists(IMAGE_DIR): os.makedirs(IMAGE_DIR)

    # 1. Procesar Productos
    print("--- Descargando Productos ---")
    for p in products:
        filename = f"{p['title'].lower().replace(' ', '_')}.jpg"
        if not os.path.exists(os.path.join(IMAGE_DIR, filename)):
            # Usamos título + categoría para mayor precisión
            query = f"{p['title']} high quality product photography"
            success = download_image(query, filename)
            if not success:
                print(f"AVISO: No se pudo obtener imagen precisa para {p['title']}, usando fallback.")
            time.sleep(0.5)

    # 2. Procesar Negocios
    print("--- Descargando Negocios ---")
    for u in users:
        # Logo
        logo_filename = f"{u['slug']}_logo.jpg"
        if not os.path.exists(os.path.join(IMAGE_DIR, logo_filename)):
            download_image(f"{u['businessName']} logo design", logo_filename)
        
        # Portada
        cover_filename = f"{u['slug']}_cover.jpg"
        if not os.path.exists(os.path.join(IMAGE_DIR, cover_filename)):
            download_image(f"{u['businessName']} store front", cover_filename)
            
    print("Pipeline de descarga finalizado.")

if __name__ == "__main__":
    run_download()
