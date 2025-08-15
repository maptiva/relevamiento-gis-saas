import './assets/main.css'

import { createApp } from 'vue'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import firebaseConfig from './firebase/config'
import router from './router'
import { user } from './composables/getUser'

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core'

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/* import specific icons */
import { faLocationCrosshairs, faDrawPolygon, faWaveSquare, faCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

/* add icons to the library */
library.add(faLocationCrosshairs, faDrawPolygon, faWaveSquare, faCircle, faEye, faEyeSlash)

// Inicializa Firebase
initializeApp(firebaseConfig)

const auth = getAuth()

let app

onAuthStateChanged(auth, (_user) => {
  console.log('Auth state changed. New user:', _user ? _user.email : 'null'); // DEBUG
  user.value = _user; // Actualiza la referencia reactiva compartida

  if (!app) {
    // Importa App.vue después de la inicialización de Firebase
    import('./App.vue').then(({ default: App }) => {
      app = createApp(App)
      app.component('font-awesome-icon', FontAwesomeIcon) // Register FontAwesomeIcon globally
      app.use(router)
      app.mount('#app')
    })
  }
})
