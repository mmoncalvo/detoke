import requests
import os
import sqlite3
import json

# Mapping: (Product ID, Image Filename, Unsplash URL)
mapping = [
    ("v8-6-p0", "lentejas_secas.jpg", "https://images.unsplash.com/photo-1584824486516-0555a07fc511?w=800"),
    ("v8-6-p1", "almendras_tostadas.jpg", "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800"),
    ("v8-6-p2", "nueces_peladas.jpg", "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800"),
    ("v8-6-p3", "granola_frutos.jpg", "https://images.unsplash.com/photo-1517093668864-da46ea53b163?w=800"),
    ("v8-6-p4", "semillas_chia.jpg", "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800"),
    ("v8-6-p5", "harina_almendras.jpg", "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800"),
    ("v8-6-p6", "miel_pura.jpg", "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"),
    ("v8-6-p7", "stevia.jpg", "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800")
]

IMG_DIR = "data/images/"
os.makedirs(IMG_DIR, exist_ok=True)

# Descargar y validar
conn = sqlite3.connect('database.sqlite')
cursor = conn.cursor()

for pid, filename, url in mapping:
    filepath = os.path.join(IMG_DIR, filename)
    print(f"Descargando {filename}...")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            # Actualizar DB
            cursor.execute("UPDATE Products SET images=? WHERE id=?", (json.dumps([filename]), pid))
            print(f"Éxito: {filename}")
        else:
            print(f"Error {response.status_code} para {filename}")
    except Exception as e:
        print(f"Excepción: {e}")

# Actualizar Portada
cover_url = "https://images.unsplash.com/photo-1506368083636-6defb4b0e8f7?w=800"
cover_file = "dietetica_cover.jpg"
response = requests.get(cover_url)
with open(os.path.join(IMG_DIR, cover_file), 'wb') as f:
    f.write(response.content)

cursor.execute("UPDATE Users SET imagenPortada=?, galeria=? WHERE id='v8-6'", (cover_file, json.dumps([cover_file])))
conn.commit()
conn.close()
