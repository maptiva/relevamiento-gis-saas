<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>{{ isLoginMode ? 'Iniciar Sesión' : 'Registrarse' }}</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input id="password" type="password" v-model="password" required />
        </div>
        <button type="submit" class="auth-button">
          {{ isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta' }}
        </button>
      </form>
      <p class="toggle-link" @click="isLoginMode = !isLoginMode">
        {{ isLoginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const router = useRouter();
const auth = getAuth();

const handleSubmit = async () => {
  if (isLoginMode.value) {
    // Lógica de Login
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value);
      router.push('/dashboard');
    } catch (error) {
      alert('Error al iniciar sesión: ' + error.message);
    }
  } else {
    // Lógica de Registro
    try {
      await createUserWithEmailAndPassword(auth, email.value, password.value);
      alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
      isLoginMode.value = true; // Cambia a modo login después del registro
    } catch (error) {
      alert('Error en el registro: ' + error.message);
    }
  }
};
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #424242;
  font-family: sans-serif;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
  font-weight: bold;
  text-align: center;
  font-size: 1.8rem;
}

.form-group {
  text-align: left;
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box; /* Asegura que el padding no afecte el ancho total */
}

.auth-button {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.auth-button:hover {
  background-color: #0056b3;
}

.toggle-link {
  margin-top: 1.5rem;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
}
</style>```
