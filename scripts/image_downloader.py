import os
from bing_image_downloader import downloader

# Definición de activos por rubro
rubros = {
    'pizzeria': ['pizza napolitana', 'pizza fugazzeta', 'calzone'],
    'carniceria': ['asado a la parrilla', 'hamburguesa gourmet', 'milanesas carne'],
    'dietetica': ['almendras', 'granola', 'lentejas'],
    'panaderia': ['facturas artesanal', 'pan frances', 'medialunas manteca'],
    'verduleria': ['lechuga fresca', 'manzanas rojas', 'bananas'],
    'almacen': ['aceite de oliva', 'arroz premium', 'leche']
}

def download_professional_assets():
    target_dir = "data/images"
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    for rubro, keywords in rubros.items():
        for keyword in keywords:
            print(f"Descargando: {keyword}")
            try:
                downloader.download(
                    keyword, 
                    limit=1, 
                    output_dir=target_dir, 
                    adult_filter_off=True, 
                    force_replace=True, 
                    timeout=60, 
                    verbose=False
                )
            except Exception as e:
                print(f"Error descargando {keyword}: {e}")
            
    print("Descarga finalizada.")

if __name__ == "__main__":
    download_professional_assets()
