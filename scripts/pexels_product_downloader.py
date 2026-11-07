import os
import requests
import time
from duckduckgo_search import DDGS
import json

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
IMAGE_DIR = "data/images"

import os
import requests
import time
import json

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
IMAGE_DIR = "data/images"

# Cargar productos desde el seed
with open('seed/products.json', 'r') as f:
    products = json.load(f)

def validate_image(filepath):
    if not os.path.exists(filepath): return False
    if os.path.getsize(filepath) < 10000: return False
    return True
# ... resto igual

def download_image(query, filename):
    headers = {"Authorization": PEXELS_API_KEY}
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=5"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            photos = response.json().get('photos', [])
            for photo in photos:
                img_url = photo['src']['medium']
                img_data = requests.get(img_url, timeout=10).content
                temp_filepath = os.path.join(IMAGE_DIR, f"temp_{filename}")
                with open(temp_filepath, 'wb') as f:
                    f.write(img_data)
                
                if validate_image(temp_filepath):
                    os.replace(temp_filepath, os.path.join(IMAGE_DIR, filename))
                    print(f"✓ {filename} ({query})")
                    return True
                else:
                    if os.path.exists(temp_filepath): os.remove(temp_filepath)
        return False
    except Exception as e:
        return False

def main():
    if not os.path.exists(IMAGE_DIR): os.makedirs(IMAGE_DIR)
    
    unique_titles = list(set([p['title'] for p in products]))
    print(f"Descargando imágenes para {len(unique_titles)} productos únicos...")
    
    for title in unique_titles:
        filename = f"{title.lower().replace(' ', '_')}.jpg"
        if not os.path.exists(os.path.join(IMAGE_DIR, filename)):
            download_image(title, filename)
            time.sleep(0.5) # Respetar rate limits de Pexels

if __name__ == "__main__":
    main()
