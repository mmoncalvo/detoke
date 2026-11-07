import os
import requests
import time
from duckduckgo_search import DDGS

# API KEY Pexels (User-provided)
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
IMAGE_DIR = "data/images"

# Rubros con queries más precisas y múltiples alternativas por si falla
rubros = {
    'pizzeria': {'query': 'italian artisan pizza', 'logo': 'pizzeria logo emblem'},
    'carniceria': {'query': 'premium raw beef cuts butcher', 'logo': 'butcher meat shop icon'},
    'dietetica': {'query': 'organic nuts dry fruits mix', 'logo': 'organic label logo'},
    'panaderia': {'query': 'fresh artisanal sourdough bread', 'logo': 'bakery logo badge'},
    'verduleria': {'query': 'fresh organic vegetables produce', 'logo': 'vegetable market icon'},
    'almacen': {'query': 'supermarket grocery products', 'logo': 'mini market store icon'}
}

def validate_image(filepath):
    """Valida si el archivo es una imagen real y tiene un tamaño decente."""
    if not os.path.exists(filepath): return False
    if os.path.getsize(filepath) < 15000: # Mínimo 15KB
        return False
    return True

def download_image(query, filename):
    headers = {"Authorization": PEXELS_API_KEY}
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=15" # Aumentado a 15 para más opciones
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            photos = response.json().get('photos', [])
            for photo in photos:
                img_url = photo['src']['large']
                img_data = requests.get(img_url, timeout=10).content
                temp_filepath = os.path.join(IMAGE_DIR, f"temp_{filename}")
                with open(temp_filepath, 'wb') as f:
                    f.write(img_data)
                
                if validate_image(temp_filepath):
                    os.replace(temp_filepath, os.path.join(IMAGE_DIR, filename))
                    print(f"✓ Descargado exitosamente: {filename} ({query})")
                    return True
                else:
                    if os.path.exists(temp_filepath): os.remove(temp_filepath)
                    print(f"! Imagen inválida o pequeña: {filename}. Probando siguiente opción...")
        else:
            print(f"Error API Pexels {response.status_code} para {query}")
    except Exception as e:
        print(f"Error descargando {query}: {e}")
            
    print(f"X Falló la descarga de {query}")
    return False

def main():
    if not os.path.exists(IMAGE_DIR):
        os.makedirs(IMAGE_DIR)

    for rubro, data in rubros.items():
        print(f"--- Procesando rubro: {rubro} ---")
        # Logo y Cover
        download_image(data['logo'], f"{rubro}_logo.jpg")
        download_image(data['query'], f"{rubro}_cover.jpg")
        
    print("Pipeline de descarga finalizado.")

if __name__ == "__main__":
    main()
