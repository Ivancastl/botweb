import requests
from bs4 import BeautifulSoup
import re
import os

# Palabras clave para buscar en JS
patrones_telegram = [
    r"telegram", r"TelegramBot", r"botFather", r"sendMessage", r"token",
    r"Telegram\.WebApp", r"window\.Telegram"
]

def buscar_referencias_telegram_en_js(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Error al acceder a la URL: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    scripts = soup.find_all("script")
    hallazgos = []

    # Crear carpeta para guardar JS sospechosos
    if not os.path.exists("js_sospechosos"):
        os.makedirs("js_sospechosos")

    for script in scripts:
        js_code = ""
        source = ""

        if script.get("src"):  # Script externo
            src = script["src"]
            if not src.startswith("http"):
                src = requests.compat.urljoin(url, src)
            try:
                js_response = requests.get(src, timeout=10)
                js_response.raise_for_status()
                js_code = js_response.text
                source = src
            except:
                continue
        else:  # Script inline
            js_code = script.text
            source = "[INLINE]"

        for patron in patrones_telegram:
            coincidencias = re.findall(patron, js_code, re.IGNORECASE)
            if coincidencias:
                hallazgos.append({
                    'archivo_js': source,
                    'coincidencias': list(set(coincidencias))
                })

                # Guardar JS sospechoso
                filename = os.path.join("js_sospechosos", re.sub(r'\W+', '_', source[-50:]) + ".js")
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(js_code)
                break

    if hallazgos:
        print("🚨 Se detectaron posibles referencias a Telegram:")
        for h in hallazgos:
            print(f"\n🔗 JS: {h['archivo_js']}")
            print("📌 Coincidencias:", ', '.join(h['coincidencias']))
    else:
        print("✅ No se detectaron referencias a Telegram.")

# 👇 Cambia la URL para probar otro sitio
url = input("🌐 Ingresa la URL a analizar: ").strip()
buscar_referencias_telegram_en_js(url)
#https://cuscatlanpagos.web.app/
#https://cloudflare-cdn-kdbvm.pages.dev/
