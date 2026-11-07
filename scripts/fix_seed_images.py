import json
import os

# Leer productos actuales
with open('seed/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Leer imágenes existentes
existing_images = os.listdir('data/images/')

def find_best_match(product_title):
    # Simplificar título
    title_parts = product_title.lower().replace(" de ", " ").replace(" con ", " ").split()
    
    best_match = None
    max_matches = 0
    
    for img in existing_images:
        if not img.endswith('.jpg'): continue
        # Comparar nombre de archivo con título
        img_name = img.replace('.jpg', '').replace('_', ' ')
        matches = sum(1 for part in title_parts if part in img_name)
        if matches > max_matches:
            max_matches = matches
            best_match = img
            
    return best_match if best_match else "almacen-1.jpg"

# Actualizar productos
for p in products:
    p['images'] = json.dumps([find_best_match(p['title'])])

# Guardar
with open('seed/products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)
