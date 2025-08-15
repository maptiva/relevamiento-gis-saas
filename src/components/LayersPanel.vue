<template>
  <aside class="layers-panel" :class="{ 'layers-panel-expanded': isExpanded }">
    <div class="panel-header">
      <h2>Panel de Capas</h2>
      <button @click="togglePanel" class="toggle-panel-button">
        {{ isExpanded ? 'X' : '&#9654;' }} <!-- X for close, right arrow for open -->
      </button>
    </div>
    <div v-if="isExpanded" class="panel-content">
      <p v-if="features.length === 0">No hay formas en el mapa.</p>
      <div v-else class="feature-list" ref="featureListRef">
        <FeatureItem
          v-for="feature in features"
          :key="feature.id"
          :feature="feature"
          :is-selected="feature.id === selectedFeatureId"
          @feature-selected="$emit('feature-selected', $event)"
          @vertex-selected="$emit('vertex-selected', $event)"
        />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'; // Added nextTick
import FeatureItem from './FeatureItem.vue';

const props = defineProps({
  features: {
    type: Array,
    default: () => []
  },
  selectedFeatureId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['feature-selected', 'vertex-selected']);

const isExpanded = ref(true); // Start expanded for development
const featureListRef = ref(null);

function togglePanel() {
  isExpanded.value = !isExpanded.value;
}

// Watch for changes in features prop to ensure reactivity
watch(() => props.features, (newFeatures) => {
  console.log('Features updated in LayersPanel:', newFeatures.length);
}, { immediate: true });

watch(() => props.selectedFeatureId, (newId) => {
  if (newId && featureListRef.value) {
    nextTick(() => { // Wrapped in nextTick
      // Find the corresponding feature item in the DOM
      const selectedElement = featureListRef.value.querySelector(`.feature-item.is-selected`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
});
</script>

<style scoped>
.layers-panel {
  width: 50px; /* Collapsed width */
  background-color: #f0f0f0;
  padding: 10px;
  flex-shrink: 0;
  color: black;
  transition: width 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Sombra de tarjeta */
  display: flex;
  flex-direction: column;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.layers-panel-expanded {
  width: 300px; /* Expanded width */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #ccc;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-panel-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #555;
  padding: 0 5px;
  line-height: 1;
}

.toggle-panel-button:hover {
  color: #000;
}

.panel-content {
  flex-grow: 1;
  overflow-y: auto;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* Basic styling for FeatureItem placeholder */
.feature-list > div {
  background-color: #e9e9e9;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  padding: 8px;
  border-radius: 4px;
}
</style>
