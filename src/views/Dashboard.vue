<template>
  <div class="dashboard-container">
    <div class="dashboard-card">
      <h2>Gestor de Proyectos</h2>
      <form @submit.prevent="createProject">
        <input type="text" v-model="newProjectName" placeholder="Nombre del nuevo proyecto..." required>
        <button type="submit">Crear Proyecto</button>
      </form>
      <ul v-if="projects.length > 0">
        <li v-for="project in projects" :key="project.id">
          <router-link :to="{ name: 'MapView', params: { id: project.id } }">{{ project.name }}</router-link>
        </li>
      </ul>
      <p v-else class="no-projects-message">
        Aún no tienes proyectos. ¡Crea uno para empezar!
      </p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { user } from '../composables/getUser';

export default {
  setup() {
    const newProjectName = ref('');
    const projects = ref([]);
    const db = getFirestore();

    async function createProject() {
      if (newProjectName.value.trim() === '' || !user.value) {
        return;
      }

      try {
        const docRef = await addDoc(collection(db, 'projects'), {
          name: newProjectName.value,
          owner: user.value.uid
        });
        newProjectName.value = '';
        fetchProjects();
      } catch (e) {
        console.error('Error adding document: ', e);
      }
    }

    async function fetchProjects() {
      if (!user.value) {
        projects.value = []; // Clear projects if no user
        return;
      }
      const q = query(collection(db, 'projects'), where('owner', '==', user.value.uid));
      const querySnapshot = await getDocs(q);
      projects.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Watch for changes in the user object and refetch projects
    watch(user, (newUser, oldUser) => {
      fetchProjects();
    }, { immediate: true }); // immediate: true runs the watcher immediately on component mount

    return { newProjectName, projects, createProject };
  }
};
</script>

<style scoped>
.dashboard-container {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Alinea la tarjeta al inicio */
  padding-top: 5rem; /* Añade espacio superior */
  min-height: 100vh;
  width: 100%;
  background-color: #424242; /* Fondo gris oscuro */
}

.dashboard-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px; /* Ancho máximo para la tarjeta */
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #333;
  font-weight: bold;
}

form {
  display: flex;
  gap: 10px;
  margin-bottom: 1.5rem;
}

input[type="text"] {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #0056b3;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  background-color: #f8f9fa;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

li a {
  display: block;
  padding: 15px;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s;
  font-weight: bold;
}

li a:hover {
  background-color: #e9ecef;
}

.no-projects-message {
  text-align: center;
  color: #6c757d;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}
</style>
