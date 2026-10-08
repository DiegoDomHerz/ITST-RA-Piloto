
import './style.css';

// Idioma seleccionado
let idioma = 'es';

// Recurso reconocido actualmente
let recursoActivo = null;

// Información bilingüe
const traducciones = {
  es: {
    subtitulo: 'Guía educativa con realidad aumentada',
    esperando: 'Apunta la cámara hacia una imagen de la guía',
    detectado: 'Imagen reconocida correctamente',
    perdido: 'Imagen perdida. Vuelve a apuntar la cámara',
    tituloInicial: 'Explorador de realidad aumentada',
    descripcionInicial: 'Escanea una imagen para descubrir su contenido en 3D.'
  },
  en: {
    subtitulo: 'Educational augmented reality guide',
    esperando: 'Point your camera at an image from the guide',
    detectado: 'Image successfully recognized',
    perdido: 'Image lost. Point your camera at it again',
    tituloInicial: 'Augmented reality explorer',
    descripcionInicial: 'Scan an image to discover its 3D content.'
  }
};

// Catálogo de recursos
const recursos = {
  0: {
    es: {
      titulo: 'Modelo de prueba',
      descripcion: 'Cubo tridimensional utilizado para verificar el reconocimiento de imágenes.'
    },
    en: {
      titulo: 'Test model',
      descripcion: 'Three-dimensional cube used to verify image recognition.'
    }
  },
  1: {
    es: {
      titulo: 'Sistema Solar',
      descripcion: 'Representación tridimensional del Sistema Solar para explorar sus componentes.'
    },
    en: {
      titulo: 'Solar System',
      descripcion: 'Three-dimensional representation of the Solar System to explore its components.'
    }
  },
  2: {
    es: {
      titulo: 'Figura de Deadpool',
      descripcion: 'Modelo tridimensional obtenido mediante fotogrametría utilizando la cámara de un teléfono móvil.'
    },
    en: {
      titulo: 'Deadpool figure',
      descripcion: 'Three-dimensional model created through photogrammetry using a mobile phone camera.'
    }
  }
};

// Elementos de la interfaz
const estado = document.getElementById('estado');
const subtitulo = document.getElementById('subtitulo');
const titulo = document.getElementById('recurso-titulo');
const descripcion = document.getElementById('recurso-descripcion');
const btnES = document.getElementById('btn-es');
const btnEN = document.getElementById('btn-en');

function actualizarInterfaz(mensaje = 'esperando') {
  const t = traducciones[idioma];

  document.documentElement.lang = idioma;
  subtitulo.textContent = t.subtitulo;
  estado.textContent = t[mensaje];

  btnES.classList.toggle('activo', idioma === 'es');
  btnEN.classList.toggle('activo', idioma === 'en');

  if (recursoActivo !== null) {
    const recurso = recursos[recursoActivo][idioma];
    titulo.textContent = recurso.titulo;
    descripcion.textContent = recurso.descripcion;
  } else {
    titulo.textContent = t.tituloInicial;
    descripcion.textContent = t.descripcionInicial;
  }
}

// Cambiar idioma
btnES.addEventListener('click', () => {
  idioma = 'es';
  actualizarInterfaz(recursoActivo !== null ? 'detectado' : 'esperando');
});

btnEN.addEventListener('click', () => {
  idioma = 'en';
  actualizarInterfaz(recursoActivo !== null ? 'detectado' : 'esperando');
});

// Registrar eventos de los tres marcadores
for (let i = 0; i < 3; i++) {
  const target = document.getElementById(`target-00${i + 1}`);

  target.addEventListener('targetFound', () => {
    recursoActivo = i;
    actualizarInterfaz('detectado');
  });

  target.addEventListener('targetLost', () => {
    if (recursoActivo === i) {
      recursoActivo = null;
      actualizarInterfaz('perdido');
    }
  });
}

// Mostrar información inicial
actualizarInterfaz();
