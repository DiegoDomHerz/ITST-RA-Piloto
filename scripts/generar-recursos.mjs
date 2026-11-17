// Genera las páginas web que abren los códigos QR de la guía (doc. 2, RF-01 y RF-16):
//   public/recurso/RA-00X/index.html  → una por recurso (abre la app o muestra el contenido sin RA)
//   public/descargar/index.html       → página del QR de descarga de la app
// Uso: node scripts/generar-recursos.mjs <carpeta assets de la app Android>
import fs from 'node:fs';
import path from 'node:path';

const assets = process.argv[2];
if (!assets) throw new Error('Indica la carpeta assets de la app, por ejemplo: ../GuiaRA/app/src/main/assets');

const BASE = 'https://diegodomherz.github.io/ITST-RA-Piloto';
const APK = 'https://github.com/DiegoDomHerz/ITST-RA-Piloto/releases/latest/download/GuiaRA-ITST.apk';
const PAQUETE = 'mx.edu.itst.guiara';
const publico = path.resolve('public');
const recursos = JSON.parse(fs.readFileSync(path.join(assets, 'recursos.json'), 'utf8'));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const estilo = `
  :root { color-scheme: light; --azul: #1E5AA8; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f5f7fb; color: #1b1b1f; }
  main { max-width: 560px; margin: 0 auto; padding: 20px 18px 40px; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .marca { color: var(--azul); font-weight: 700; }
  .idioma button { border: 1px solid #c5c6d0; background: #fff; border-radius: 999px; padding: 6px 12px; font: inherit; cursor: pointer; }
  .idioma button[aria-pressed="true"] { background: var(--azul); color: #fff; border-color: var(--azul); }
  .id { color: #5d5e67; font-size: 14px; margin: 18px 0 2px; }
  h1 { margin: 0 0 14px; font-size: 26px; line-height: 1.2; }
  img { display: block; width: 100%; max-height: 40vh; object-fit: contain; border-radius: 12px; background: #fff; }
  p { font-size: 17px; line-height: 1.5; }
  audio { width: 100%; margin: 6px 0 18px; }
  .boton { display: block; text-align: center; padding: 15px; border-radius: 999px; font-weight: 600; text-decoration: none; margin: 10px 0; }
  .principal { background: var(--azul); color: #fff; }
  .secundario { border: 1px solid #c5c6d0; color: var(--azul); background: #fff; }
  .nota { font-size: 14px; color: #5d5e67; }
  section[lang]:not(.activo) { display: none; }
`;

// Cambia entre español e inglés según el idioma del navegador o el botón elegido
const scriptIdioma = `
  const elegir = (l) => {
    document.querySelectorAll('section[lang]').forEach(e => e.classList.toggle('activo', e.lang === l));
    document.querySelectorAll('.idioma button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === l));
    document.querySelectorAll('audio').forEach(a => a.pause());
    document.documentElement.lang = l;
  };
  document.querySelectorAll('.idioma button').forEach(b => b.onclick = () => elegir(b.dataset.l));
  elegir((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  // El botón «Abrir en la app» solo tiene sentido en Android
  if (!/android/i.test(navigator.userAgent)) document.querySelectorAll('.solo-android').forEach(e => e.remove());
`;

const pagina = (titulo, cuerpo) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Guía RA ITST</title>
<style>${estilo}</style>
</head>
<body>
<main>
  <header>
    <span class="marca">ITST · Guía RA</span>
    <span class="idioma"><button data-l="es">ES</button> <button data-l="en">EN</button></span>
  </header>
${cuerpo}
</main>
<script>${scriptIdioma}</script>
</body>
</html>
`;

// Copia la ilustración y los audios de cada recurso
const media = path.join(publico, 'recurso', 'media');
fs.mkdirSync(media, { recursive: true });
const copiar = (ruta) => {
    if (!ruta) return null;
    const nombre = path.basename(ruta);
    fs.copyFileSync(path.join(assets, ruta), path.join(media, nombre));
    return `../media/${nombre}`;
};

for (const r of recursos) {
    const img = copiar(r.imagen);
    const audio = { es: copiar(r.audio_es), en: copiar(r.audio_en) };
    const descarga = `${BASE}/descargar/`;
    const intento = `intent://recurso/${r.id}#Intent;scheme=guiara;package=${PAQUETE};S.browser_fallback_url=${encodeURIComponent(descarga)};end`;
    const bloque = (l, nombre, desc, txt) => `
  <section lang="${l}">
    <p class="id">${esc(r.id)}</p>
    <h1>${esc(nombre)}</h1>
    ${img ? `<img src="${img}" alt="${esc(nombre)}">` : ''}
    <p>${esc(desc)}</p>
    ${audio[l] ? `<audio controls preload="none" src="${audio[l]}"></audio>` : ''}
    <a class="boton principal solo-android" href="${esc(intento)}">${txt.abrir}</a>
    <a class="boton secundario" href="${descarga}">${txt.descargar}</a>
    <p class="nota">${txt.nota}</p>
  </section>`;
    const html = pagina(r.nombre_es,
        bloque('es', r.nombre_es, r.descripcion_es, {
            abrir: 'Abrir en la app (Realidad Aumentada)',
            descargar: 'Descargar la app',
            nota: 'La experiencia de Realidad Aumentada se consulta desde la app. Esta página permite revisar el contenido sin RA.',
        }) +
        bloque('en', r.nombre_en, r.descripcion_en, {
            abrir: 'Open in the app (Augmented Reality)',
            descargar: 'Download the app',
            nota: 'The Augmented Reality experience is available in the app. This page shows the content without AR.',
        }));
    const dir = path.join(publico, 'recurso', r.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`recurso/${r.id}/`);
}

// Página del QR de descarga
const descargar = (l, t) => `
  <section lang="${l}">
    <h1>${t.titulo}</h1>
    <p>${t.texto}</p>
    <a class="boton principal" href="${APK}">${t.boton}</a>
    <ol class="nota">${t.pasos.map(p => `<li>${p}</li>`).join('')}</ol>
  </section>`;
fs.mkdirSync(path.join(publico, 'descargar'), { recursive: true });
fs.writeFileSync(path.join(publico, 'descargar', 'index.html'), pagina('Descargar la app',
    descargar('es', {
        titulo: 'Guía de recursos educativos con Realidad Aumentada',
        texto: 'Descarga la aplicación para Android (7.0 o superior) y consulta los recursos de la guía con Realidad Aumentada, audio y modelos 3D.',
        boton: 'Descargar la app (APK)',
        pasos: ['Pulsa «Descargar la app».', 'Abre el archivo descargado y permite la instalación desde esta fuente si el teléfono lo solicita.', 'Abre la app y pulsa «Escanear la guía» o escanea el código QR de un recurso.'],
    }) +
    descargar('en', {
        titulo: 'Educational resources guide with Augmented Reality',
        texto: 'Download the Android app (7.0 or later) to explore the guide resources with Augmented Reality, audio and 3D models.',
        boton: 'Download the app (APK)',
        pasos: ['Tap “Download the app”.', 'Open the downloaded file and allow installation from this source if your phone asks.', 'Open the app and tap “Scan the guide” or scan a resource QR code.'],
    })));
console.log('descargar/');
