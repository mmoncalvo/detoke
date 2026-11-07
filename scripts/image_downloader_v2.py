import os
import asyncio
from duckduckgo_search import DDGS
import requests

# Mapa de activos profesionales
rubros = {
    'pizzeria': {'keywords': ['professional pizza photography', 'neapolitan pizza restaurant'], 'logo': 'pizzeria logo design'},
    'carniceria': {'keywords': ['butcher shop raw meat premium', 'gourmet burger raw'], 'logo': 'butcher shop logo'},
    'dietetica': {'keywords': ['healthy nuts and dry fruits', 'organic seeds and grains'], 'logo': 'dietetic shop logo'},
    'panaderia': {'keywords': ['fresh artisanal bread', 'bakery pastries'], 'logo': 'bakery logo design'},
    'verduleria': {'keywords': ['fresh fruits and vegetables', 'organic farm produce'], 'logo': 'vegetable shop logo'},
    'almacen': {'keywords': ['supermarket shelves groceries', 'premium cooking oil bottle'], 'logo': 'mini market logo'}
}

async def download_image(query, folder, filename):
    try:
        with DDGS() as ddgs:
            results = ddgs.images(query, max_results=1)
            for r in results:
                url = r['image']
                print(f"Descargando {query} desde {url}...")
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    filepath = os.path.join("data/images", filename)
                    with open(filepath, 'wb') as f:
                        f.write(response.content)
                    return True
    except Exception as e:
        print(f"Error descargando {query}: {e}")
    return False

async def main():
    if not os.path.exists("data/images"):
        os.makedirs("data/images")

    for rubro, data in rubros.items():
        # Descargar Logo
        await download_image(data['logo'], "data/images", f"{rubro}_logo.jpg")
        # Descargar Productos
        for i, kw in enumerate(data['keywords']):
            await download_image(kw, "data/images", f"{rubro}_{i}.jpg")

    print("Descarga finalizada.")

if __name__ == "__main__":
    asyncio.run(main())
