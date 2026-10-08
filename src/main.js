import './style.css'

console.log('Prototipo WebAR - ITST')
console.log('A-Frame:', typeof AFRAME !== 'undefined' ? 'OK' : 'ERROR')
console.log(
  'MindAR:',
  typeof AFRAME?.components?.['mindar-image'] !== 'undefined'
    ? 'OK'
    : 'ERROR'
)

const target = document.querySelector('#target-001')
const estado = document.querySelector('#estado')

target.addEventListener('targetFound', () => {
  console.log('TARGET-001 detectado')
  estado.textContent = '✓ Imagen reconocida - RA activa'
  estado.classList.add('detectado')
})

target.addEventListener('targetLost', () => {
  console.log('TARGET-001 perdido')
  estado.textContent = 'Apunta la cámara hacia IMG-001'
  estado.classList.remove('detectado')
})