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
  h2 { font-size: 18px; margin: 18px 0 8px; }
  model-viewer { display: block; width: 100%; height: 340px; background: #fff; border-radius: 12px; --poster-color: #fff; }
  .aviso-ar { background: #FFF4E5; border-radius: 10px; padding: 10px 12px; font-size: 15px; }
  model-viewer .ar { position: absolute; left: 12px; right: 12px; bottom: 12px; margin: 0; border: 0; font: inherit; font-weight: 600; cursor: pointer; }
`;

// Visor 3D web: <model-viewer> de Google. Permite girar el modelo y, en teléfonos con servicios
// de RA (Scene Viewer en Android, Quick Look en iOS), colocarlo en el espacio sin instalar la app.
const MODEL_VIEWER = '<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>';

// Si la RA del sistema no puede iniciar (p. ej. teléfono sin ARCore), se oculta el botón y se explica por qué.
// Scene Viewer regresa a la página con #model-viewer-no-ar-fallback cuando no está disponible.
const AVISO_SIN_AR = `<script>
  const sinAr = () => {
    // Se desactiva la RA del visor (si solo se quitara el botón, aparecería el ícono de RA predeterminado)
    document.querySelectorAll('model-viewer').forEach(mv => mv.removeAttribute('ar'));
    document.querySelectorAll('.aviso-ar').forEach(p => p.hidden = false);
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (location.hash.includes('no-ar-fallback')) sinAr();
    document.querySelectorAll('model-viewer').forEach(mv =>
      mv.addEventListener('ar-status', e => { if (e.detail.status === 'failed') sinAr(); }));
  });
  addEventListener('hashchange', () => { if (location.hash.includes('no-ar-fallback')) sinAr(); });
</script>`;

/** Genera un cubo GLB (lado en metros, color RGB 0–1) para el recurso de prueba que la app dibuja por código. */
function crearCuboGlb(salida, lado, color) {
    const h = lado / 2;
    const caras = [[[1, 0, 0], [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]]], [[-1, 0, 0], [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]]],
        [[0, 1, 0], [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]]], [[0, -1, 0], [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]]],
        [[0, 0, 1], [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]]], [[0, 0, -1], [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]]]];
    const pos = [], nor = [], idx = [];
    caras.forEach(([n, vs], c) => { vs.forEach(v => { pos.push(...v); nor.push(...n); }); const b = c * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); });
    const bPos = Buffer.from(new Float32Array(pos).buffer), bNor = Buffer.from(new Float32Array(nor).buffer), bIdx = Buffer.from(new Uint16Array(idx).buffer);
    const bin = Buffer.concat([bPos, bNor, bIdx]);
    const gltf = {
        asset: { version: '2.0', generator: 'generar-recursos.mjs (Guía RA ITST)' },
        scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'Cubo' }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
        materials: [{ pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
        buffers: [{ byteLength: bin.length }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bPos.length, target: 34962 }, { buffer: 0, byteOffset: bPos.length, byteLength: bNor.length, target: 34962 },
            { buffer: 0, byteOffset: bPos.length + bNor.length, byteLength: bIdx.length, target: 34963 }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-h, -h, -h], max: [h, h, h] },
            { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' }, { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' }],
    };
    let json = Buffer.from(JSON.stringify(gltf));
    json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
    const binPad = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
    const encabezado = Buffer.alloc(12);
    encabezado.write('glTF', 0); encabezado.writeUInt32LE(2, 4); encabezado.writeUInt32LE(12 + 8 + json.length + 8 + binPad.length, 8);
    const chunk = (b, tipo) => { const c = Buffer.alloc(8); c.writeUInt32LE(b.length, 0); c.writeUInt32LE(tipo, 4); return Buffer.concat([c, b]); };
    fs.writeFileSync(salida, Buffer.concat([encabezado, chunk(json, 0x4E4F534A), chunk(binPad, 0x004E4942)]));
}

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

const pagina = (titulo, cuerpo, cabecera = '') => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Guía RA ITST</title>
<style>${estilo}</style>
${cabecera}
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
    // Modelo 3D para el visor web; el cubo de prueba se genera como GLB (azul ITST, 20 cm de lado)
    let modelo = null;
    if (r.tipo === 'cubo') {
        const nombre = `cubo-${r.id.toLowerCase()}.glb`;
        crearCuboGlb(path.join(media, nombre), 0.2, [0.0123, 0.1022, 0.3916]);
        modelo = `../media/${nombre}`;
    } else {
        modelo = copiar(r.modelo);
    }
    const descarga = `${BASE}/descargar/`;
    const intento = `intent://recurso/${r.id}#Intent;scheme=guiara;package=${PAQUETE};S.browser_fallback_url=${encodeURIComponent(descarga)};end`;
    const bloque = (l, nombre, desc, txt) => `
  <section lang="${l}">
    <p class="id">${esc(r.id)}</p>
    <h1>${esc(nombre)}</h1>
    ${img ? `<img src="${img}" alt="${esc(nombre)}">` : ''}
    <p>${esc(desc)}</p>
    ${audio[l] ? `<audio controls preload="none" src="${audio[l]}"></audio>` : ''}
    ${modelo ? `<h2>${txt.modelo}</h2>
    <model-viewer src="${modelo}" alt="${esc(nombre)}" camera-controls auto-rotate touch-action="pan-y"
        shadow-intensity="0.8" ar ar-modes="scene-viewer webxr quick-look" ar-scale="auto">
      <button slot="ar-button" class="boton principal ar">${txt.ar}</button>
    </model-viewer>
    <p class="aviso-ar" hidden>${txt.sinAr}</p>
    <p class="nota">${txt.girar}</p>` : ''}
    <a class="boton principal" href="../../ra/?r=${r.id}&amp;lang=${l}">${txt.raGuia}</a>
    <p class="nota">${txt.raGuiaNota}</p>
    <a class="boton principal solo-android" href="${esc(intento)}">${txt.abrir}</a>
    <a class="boton secundario" href="${descarga}">${txt.descargar}</a>
    <p class="nota">${txt.nota}</p>
  </section>`;
    const html = pagina(r.nombre_es,
        bloque('es', r.nombre_es, r.descripcion_es, {
            abrir: 'Abrir en la app (Realidad Aumentada)',
            descargar: 'Descargar la app',
            nota: 'La RA sobre la ilustración de la guía se consulta desde la app. Esta página permite revisar el contenido y el modelo 3D sin instalarla.',
            modelo: 'Modelo 3D',
            ar: 'Ver en tu espacio (RA)',
            girar: 'Arrastra para girar el modelo y pellizca para acercarlo. Si tu teléfono lo permite, «Ver en tu espacio» lo coloca sobre una superficie real.',
            sinAr: 'Tu teléfono no es compatible con la RA de Google (requiere ARCore). Puedes girar el modelo aquí, usar «Ver en RA sobre la guía» o abrir la app.',
            raGuia: 'Ver en RA sobre la guía (sin instalar)',
            raGuiaNota: 'Abre la cámara en el navegador y muestra el modelo sobre la ilustración impresa. Funciona en la mayoría de los teléfonos.',
        }) +
        bloque('en', r.nombre_en, r.descripcion_en, {
            abrir: 'Open in the app (Augmented Reality)',
            descargar: 'Download the app',
            nota: 'AR on the guide illustration is available in the app. This page shows the content and the 3D model without installing it.',
            modelo: '3D model',
            ar: 'View in your space (AR)',
            girar: 'Drag to rotate the model and pinch to zoom. If your phone supports it, “View in your space” places it on a real surface.',
            sinAr: 'Your phone does not support Google AR (it requires ARCore). You can rotate the model here, use “View in AR on the guide” or open the app.',
            raGuia: 'View in AR on the guide (no install)',
            raGuiaNota: 'Opens the camera in the browser and shows the model on the printed illustration. Works on most phones.',
        }), MODEL_VIEWER + AVISO_SIN_AR);
    const dir = path.join(publico, 'recurso', r.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`recurso/${r.id}/`);
}

// ---------- RA sobre la ilustración en el navegador (/ra/) ----------
// Misma tecnología que el motor alternativo de la app (MindAR + A-Frame) y los mismos archivos:
// targets.mind y las bibliotecas se copian de assets/webar; los modelos, de recurso/media.
// Funciona en teléfonos sin ARCore y sin instalar la app (el navegador solo necesita la cámara y HTTPS).
const dirRa = path.join(publico, 'ra');
fs.mkdirSync(path.join(dirRa, 'lib'), { recursive: true });
for (const f of ['lib/aframe.min.js', 'lib/mindar-image-aframe.prod.js', 'targets.mind']) {
    fs.copyFileSync(path.join(assets, 'webar', f), path.join(dirRa, f));
}
const datosRa = recursos.map(r => ({
    id: r.id, es: { nombre: r.nombre_es, desc: r.descripcion_es }, en: { nombre: r.nombre_en, desc: r.descripcion_en },
    tipo: r.tipo, modelo: r.modelo ? `../recurso/media/${path.basename(r.modelo)}` : null,
}));
fs.writeFileSync(path.join(dirRa, 'index.html'), `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RA sobre la guía · Guía RA ITST</title>
<script src="lib/aframe.min.js"></script>
<script src="lib/mindar-image-aframe.prod.js"></script>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .capa { position: fixed; left: 12px; right: 12px; z-index: 10; }
  .arriba { top: 12px; display: flex; gap: 8px; align-items: flex-start; }
  .abajo { bottom: 16px; }
  .boton { background: #1E5AA8; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
  .mensaje, .ficha { background: rgba(255,255,255,.94); border-radius: 14px; padding: 12px 14px; font-size: 15px; line-height: 1.4; }
  .mensaje { flex: 1; }
  .ficha small { color: #5d5e67; } .ficha h2 { margin: 2px 0 6px; font-size: 20px; } .ficha p { margin: 0 0 10px; }
  .ficha a { color: #1E5AA8; font-weight: 600; }
</style>
</head>
<body>
<div class="capa arriba"><a class="boton" id="volver" href="#">‹</a><div class="mensaje" id="mensaje"></div></div>
<div class="capa abajo"><div class="ficha" id="ficha" hidden></div></div>
<a-scene id="escena" mindar-image="imageTargetSrc: targets.mind; autoStart: false; maxTrack: 1; uiLoading: yes; uiScanning: no; uiError: yes"
    color-space="sRGB" renderer="colorManagement: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  <a-light type="ambient" intensity="0.9"></a-light>
  <a-light type="directional" position="0 1 1" intensity="0.8"></a-light>
</a-scene>
<script>
  const RECURSOS = ${JSON.stringify(datosRa)};
  const q = new URLSearchParams(location.search);
  const L = q.get('lang') === 'en' || (!q.get('lang') && !(navigator.language || 'es').toLowerCase().startsWith('es')) ? 'en' : 'es';
  const T = {
    es: { apunta: 'Apunta la cámara a una ilustración de la guía impresa.', noReconoce: '¿No se reconoce? Aleja el teléfono para que la ilustración se vea completa y mejora la luz.',
          ficha: 'Ver ficha, audio y modelo 3D', camara: 'No se pudo abrir la cámara. Permite el acceso a la cámara en el navegador e inténtalo de nuevo.' },
    en: { apunta: 'Point the camera at an illustration in the printed guide.', noReconoce: 'Not recognized? Move the phone back so the whole illustration is visible and improve the lighting.',
          ficha: 'View sheet, audio and 3D model', camara: 'The camera could not be opened. Allow camera access in the browser and try again.' },
  }[L];
  document.documentElement.lang = L;
  const origen = q.get('r');
  document.getElementById('volver').href = origen ? '../recurso/' + origen + '/' : '../';
  const mensaje = document.getElementById('mensaje'), ficha = document.getElementById('ficha');
  mensaje.textContent = T.apunta;

  // Escala cada modelo para que su lado mayor mida 0.6 del ancho de la ilustración y lo apoya sobre ella
  AFRAME.registerComponent('ajustar-tamano', { init() { this.el.addEventListener('model-loaded', () => {
    const THREE = AFRAME.THREE, obj = this.el.getObject3D('mesh'), padre = obj.parent;
    padre.remove(obj); obj.updateMatrixWorld(true); const caja = new THREE.Box3().setFromObject(obj); padre.add(obj);
    const dim = caja.getSize(new THREE.Vector3()), s = 0.6 / (Math.max(dim.x, dim.y, dim.z) || 1);
    this.el.object3D.scale.set(s, s, s); obj.position.sub(caja.getCenter(new THREE.Vector3())); this.el.object3D.position.z = dim.z * s / 2;
  }); } });

  let actual = null, sinDeteccion = 0;
  setInterval(() => { sinDeteccion = actual ? 0 : sinDeteccion + 1; if (!actual) mensaje.textContent = sinDeteccion >= 10 ? T.noReconoce : T.apunta; }, 1000);
  // Muestra la ficha del recurso reconocido (o el mensaje de guía si no hay ninguno)
  const mostrar = r => {
    actual = r;
    mensaje.hidden = !!r;
    ficha.hidden = !r;
    if (!r) return;
    ficha.innerHTML = '<small>' + r.id + '</small><h2></h2><p></p><a href="../recurso/' + r.id + '/?lang=' + L + '">' + T.ficha + '</a>';
    ficha.querySelector('h2').textContent = r[L].nombre;
    ficha.querySelector('p').textContent = r[L].desc;
  };

  const escena = document.getElementById('escena');
  const iniciar = () => {
    RECURSOS.forEach((r, i) => {
      const ancla = document.createElement('a-entity');
      ancla.setAttribute('mindar-image-target', 'targetIndex: ' + i);
      let c;
      if (r.tipo === 'cubo') {
        c = document.createElement('a-box');
        c.setAttribute('position', '0 0 0.25'); c.setAttribute('scale', '0.5 0.5 0.5'); c.setAttribute('color', '#1E5AA8');
        c.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear');
      } else if (r.modelo) {
        c = document.createElement('a-entity'); c.setAttribute('gltf-model', 'url(' + r.modelo + ')'); c.setAttribute('ajustar-tamano', '');
      }
      if (c) ancla.appendChild(c);
      ancla.addEventListener('targetFound', () => mostrar(r));
      ancla.addEventListener('targetLost', () => { if (actual === r) mostrar(null); });
      escena.appendChild(ancla);
    });
    setTimeout(() => escena.systems['mindar-image-system'].start(), 0);
  };
  escena.addEventListener('arError', () => { mensaje.textContent = T.camara; });
  if (escena.hasLoaded) iniciar(); else escena.addEventListener('loaded', iniciar);
</script>
</body>
</html>
`);
console.log('ra/');

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
