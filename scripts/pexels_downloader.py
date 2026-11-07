import os
import requests

# REEMPLAZA ESTA KEY CON TU API KEY DE PEXELS (Obtenida en https://www.pexels.com/api/)
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")

rubros = {
    'pizzeria': {'query': 'authentic italian pizza gourmet', 'logo': 'minimalist pizza logo'},
    'carniceria': {'query': 'premium raw steak cuts', 'logo': 'butcher meat logo'},
    'dietetica': {'query': 'assorted organic nuts and dried fruits', 'logo': 'organic natural label'},
    'panaderia': {'query': 'fresh artisan bread bakery', 'logo': 'bakery logo minimalist'},
    'verduleria': {'query': 'vibrant fresh fruits and vegetables', 'logo': 'vegetable shop icon'},
    'almacen': {'query': 'supermarket grocery shelves organized', 'logo': 'store abstract icon'}
}

def download_from_pexels(query, filename):
    headers = {"Authorization": PEXELS_API_KEY}
    url = f"https://api.pexels.com/v1/search?query={query}&per_page=1"
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['photos']:
                img_url = data['photos'][0]['src']['large']
                img_data = requests.get(img_url).content
                filepath = os.path.join("data/images", filename)
                with open(filepath, 'wb') as f:
                    f.write(img_data)
                print(f"Descargado: {filename} desde {query}")
                return True
        else:
            print(f"Error {response.status_code} para {query}")
    except Exception as e:
        print(f"Error descargando {query}: {e}")
    return False

def main():
    target_dir = "data/images"
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    for rubro, data in rubros.items():
        # Descargar Logo
        download_from_pexels(data['logo'], f"{rubro}_logo.jpg")
        # Descargar Cover
        download_from_pexels(data['query'], f"{rubro}_cover.jpg")
        # Descargar productos (usando palabras clave)
        if 'keywords' in data:
            for i, kw in enumerate(data['keywords']):
                 download_from_pexels(kw, f"{rubro}_{i}.jpg")

    print("Proceso de descarga finalizado.")

if __name__ == "__main__":
    main()
