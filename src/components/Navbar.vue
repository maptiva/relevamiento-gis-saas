<template>
  <nav class="navbar">
    <div class="navbar-left">
      <router-link v-if="route.path !== '/dashboard'" to="/dashboard" class="nav-link">Mis Proyectos</router-link>
      <span v-if="showProjectName" class="project-name-display">
        / {{ currentProjectName }}
      </span>
    </div>
    <div class="navbar-right">
      <span v-if="user" class="user-email">{{ user.email }}</span>
      <button @click="handleSignOut" class="logout-button">Cerrar Sesión</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import { user } from '@/composables/getUser';
import { inject, computed } from 'vue';

const router = useRouter();
const route = useRoute(); // Initialize useRoute
const currentProjectName = inject('projectName'); // Inject the provided project name

const showProjectName = computed(() => {
  return currentProjectName.value && route.name === 'MapView';
});

const handleSignOut = async () => {
  try {
    await signOut(getAuth());
    user.value = null; // Clear user state
    router.push('/'); // Redirect to login
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  z-index: 9999;
}

.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
}

.nav-link {
  margin-right: 1rem;
  text-decoration: none;
  color: #333; /* Dark gray for "Mis Proyectos" */
  padding: 6px 12px; /* Slightly less padding than action-button */
  border: 1px solid #ccc; /* Thin light gray border */
  border-radius: 4px; /* Rounded corners */
  background-color: transparent; /* Transparent background */
  transition: background-color 0.2s ease, border-color 0.2s ease; /* Smooth transition */
}

.nav-link:hover {
  background-color: #f0f0f0; /* Light gray background on hover */
  border-color: #bbb; /* Slightly darker border on hover */
  text-decoration: none; /* Remove underline on hover */
}

.project-name-display {
  color: #007bff; /* Blue for project name */
  font-weight: bold;
}

.user-email {
  margin-right: 1rem;
  font-style: italic;
  color: #212529; /* Color de texto oscuro para contraste */
}

.logout-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #dc3545;
  color: white;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #c82333;
}
</style>
