<template>
  <Teleport to="body">
    <Navbar v-if="user" />
  </Teleport>
  <main class="main-content">
    <router-view />
  </main>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue';
import { user } from '@/composables/getUser';
import { ref, provide } from 'vue';

const currentProjectName = ref(null);
provide('projectName', currentProjectName);
</script>

<style scoped>
.main-content {
  padding-top: 60px; /* Adjust this based on the actual height of the navbar */
}

header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
