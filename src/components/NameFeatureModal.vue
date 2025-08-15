<template>
  <div v-if="isVisible" class="modal-overlay">
    <div class="modal-content">
      <h3>Nombre de la Nueva Forma</h3>
      <input type="text" v-model="featureName" placeholder="Introduce el nombre aquí" @keyup.enter="confirmName" />
      <div class="modal-actions">
        <button @click="confirmName">Aceptar</button>
        <button @click="cancel">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['confirmed', 'cancelled']);

const isVisible = ref(props.show);
const featureName = ref('');

watch(() => props.show, (newVal) => {
  isVisible.value = newVal;
  if (newVal) {
    featureName.value = ''; // Reset name when shown
  }
});

const confirmName = () => {
  if (featureName.value.trim()) {
    emit('confirmed', featureName.value.trim());
    isVisible.value = false;
  } else {
    alert('Por favor, introduce un nombre para la forma.');
  }
};

const cancel = () => {
  emit('cancelled');
  isVisible.value = false;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  text-align: center;
  width: 90%;
  max-width: 400px;
}

h3 {
  margin-top: 0;
  color: #333;
  font-size: 1.4em;
  margin-bottom: 20px;
}

input[type="text"] {
  width: calc(100% - 20px);
  padding: 12px 10px;
  margin-bottom: 25px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
}

input[type="text"]:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.modal-actions button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  margin: 0 10px;
  transition: background-color 0.2s ease;
}

.modal-actions button:hover {
  background-color: #0056b3;
}

.modal-actions button:last-child {
  background-color: #6c757d;
}

.modal-actions button:last-child:hover {
  background-color: #5a6268;
}
</style>
