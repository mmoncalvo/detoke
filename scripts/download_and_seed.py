import os
import requests
import json
import time

# Mapeo de productos a imágenes (usando una fuente de imágenes de muestra gratuita y estable)
# Nota: Usamos URLs de muestra que simulan productos reales para descargar.
image_map = {
    "Pizza Mozzarella": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500",
    "Pizza Napolitana": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500",
    "Pizza Especial": "https://images.unsplash.com/photo-1590947132387-155ca02f7253?w=500",
    "Fugazzeta": "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=500",
    "Calzone": "https://images.unsplash.com/photo-1614707267637-08703080084f?w=500",
    "Empanadas de Carne": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500",
    "Fainá": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500",
    "Bebida Cola": "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500",
    "Manzanas Rojas": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500",
    "Lechuga Fresca": "https://images.unsplash.com/photo-1622206151226-18ca2c581074?w=500",
    "Bananas": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500",
    "Tomates Cherry": "https://images.unsplash.com/photo-1592924357228-9564da86a73a?w=500",
    "Zanahorias": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500",
    "Papas Blancas": "https://images.unsplash.com/photo-1518977676601-b53f82aba657?w=500",
    "Cebollas": "https://images.unsplash.com/photo-1620574382635-430263659c23?w=500",
    "Limones": "https://images.unsplash.com/photo-1582693679803-0d32d0dfa024?w=500",
    "Arroz Premium": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500",
    "Aceite de Oliva": "https://images.unsplash.com/photo-1474979266404-7ea3cbd97955?w=500",
    "Fideos Tirabuzón": "https://images.unsplash.com/photo-1612203852033-a363b8a36f73?w=500",
    "Lentejas": "https://images.unsplash.com/photo-1584824486516-0555a07fc511?w=500",
    "Yerba Mate": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500",
    "Azúcar": "https://images.unsplash.com/photo-1589993208750-71175654523c?w=500",
    "Harina 000": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    "Sal Fina": "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500",
    "Facturas Mixtas": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
    "Pan Francés": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500",
    "Medialunas": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500",
    "Pan Integral": "https://images.unsplash.com/photo-1589367307237-7756778f23f8?w=500",
    "Bizcochos": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500",
    "Torta Chocolate": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500",
    "Pre-pizza": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500",
    "Donas": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500",
    "Asado de Tira": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500",
    "Milanesas de Pollo": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500",
    "Hamburguesas de Carne": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    "Chorizo de Cerdo": "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=500",
    "Vacío": "https://images.unsplash.com/photo-1558030006-450675383462?w=500",
    "Matambre": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500",
    "Peceto": "https://images.unsplash.com/photo-1558030006-450675383462?w=500",
    "Carne Picada": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    "Queso Tybo": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?w=500",
    "Jamón Cocido": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500",
    "Salame": "https://images.unsplash.com/photo-1599599810769-bcde5a16bb23?w=500",
    "Queso Roquefort": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?w=500",
    "Mortadela": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500",
    "Paleta": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500",
    "Bondiola": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500",
    "Queso Untable": "https://images.unsplash.com/photo-1618164435735-41353b06b44a?w=500",
    "Coca Cola 1.5L": "https://images.unsplash.com/photo-1624517452488-048c1304e2ca?w=500",
    "Jugo de Naranja": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500",
    "Agua Mineral": "https://images.unsplash.com/photo-1548848283-7de877995f54?w=500",
    "Cerveza Lata": "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500",
    "Sprite": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500",
    "Agua Saborizada": "https://images.unsplash.com/photo-1548848283-7de877995f54?w=500",
    "Vino Malbec": "https://images.unsplash.com/photo-1510812431401-41d6bd2522f3?w=500",
    "Soda": "https://images.unsplash.com/photo-1548848283-7de877995f54?w=500",
    "Jabón Líquido": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Papel Higiénico": "https://images.unsplash.com/photo-1605335552230-6725287f3e46?w=500",
    "Detergente": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Esponjas": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Shampoo": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Pasta Dental": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Lavandina": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Desodorante Spray": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    "Empanadas de Pollo": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500",
    "Sandwich de Milanesa": "https://images.unsplash.com/photo-1528735602780-2552fd46c7ab?w=500",
    "Pollo al Horno": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500",
    "Ensalada Rusa": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500",
    "Tortilla de Papas": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500",
    "Tarta de Verdura": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500",
    "Milanesa de Soja": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500"
}

# Descargar imágenes
for prod, url in image_map.items():
    filename = url.split('/')[-1].split('?')[0] + '.jpg'
    filepath = f"data/images/{filename}"
    if not os.path.exists(filepath):
        print(f"Descargando {prod}...")
        try:
            response = requests.get(url, stream=True)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            time.sleep(0.5) # Evitar rate limit
        except Exception as e:
            print(f"Error descargando {prod}: {e}")

# Ahora generamos los seeds con estos nombres de archivo
