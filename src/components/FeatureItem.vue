<template>
  <div class="feature-item" :class="{ 'is-selected': isSelected }">
    <div class="feature-header" @click="toggleAccordion">
      <span class="feature-icon">
        <font-awesome-icon v-if="feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'" icon="draw-polygon" />
        <font-awesome-icon v-else-if="feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString'" icon="wave-square" />
        <font-awesome-icon v-else-if="feature.geometry.type === 'Point'" icon="circle" />
      </span>
      <span class="feature-name">{{ feature.properties.name || 'Sin nombre' }}</span>
    </div>
    <div v-if="isAccordionOpen" class="feature-details">
      <div class="data-summary">
        <p><strong>Tipo:</strong> {{ getGeometryTypeLabel(feature.geometry.type) }}</p>
        <p><strong>{{ summaryLabelAndValue.label }}</strong> {{ summaryLabelAndValue.value }}</p>
      </div>
      <div class="vertices-list">
        <strong>Vértices:</strong>
        <ul>
          <li v-for="(vertex, index) in vertices" :key="index" @click.stop="selectVertex(vertex)">
            {{ index + 1 }}: ({{ vertex[1].toFixed(6) }}, {{ vertex[0].toFixed(6) }})
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import * as turf from '@turf/turf';

const props = defineProps({
  feature: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['feature-selected', 'vertex-selected']);

const isAccordionOpen = ref(false);

// Computed property for calculated value (area/length/coords)
const calculatedValue = computed(() => {
  const geojson = props.feature;
  const type = turf.getType(geojson);
  let value = '';

  switch (type) {
    case 'Polygon':
    case 'MultiPolygon':
      const area = turf.area(geojson);
      if (area < 10000) {
        value = `${area.toFixed(2)} m²`;
      } else if (area < 1000000) {
        value = `${(area / 10000).toFixed(2)} ha`;
      } else {
        value = `${(area / 1000000).toFixed(2)} km²`;
      }
      break;
    case 'LineString':
    case 'MultiLineString':
      const length = turf.length(geojson, { units: 'meters' });
      if (length < 1000) {
        value = `${length.toFixed(2)} m`;
      } else {
        value = `${(length / 1000).toFixed(2)} km`;
      }
      break;
    case 'Point':
      const coords = turf.getCoord(geojson);
      value = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`; // Removed parentheses
      break;
  }
  return value;
});

const summaryLabelAndValue = computed(() => {
  const type = turf.getType(props.feature);
  let label = '';
  let value = calculatedValue.value; // Use the existing calculatedValue

  switch (type) {
    case 'Point':
      label = 'Coordenadas:';
      break;
    case 'LineString':
    case 'MultiLineString':
      label = 'Longitud:';
      break;
    case 'Polygon':
    case 'MultiPolygon':
      label = 'Área:';
      break;
    default:
      label = 'Valor:';
  }
  return { label, value };
});

// Computed property for vertices
const vertices = computed(() => {
  const geojson = props.feature;
  const type = turf.getType(geojson);
  let coords = [];

  if (type === 'Point') {
    coords.push(turf.getCoord(geojson));
  } else if (type === 'LineString') {
    coords = turf.getCoords(geojson);
  } else if (type === 'Polygon') {
    // For polygons, we usually care about the outer ring
    coords = turf.getCoords(geojson)[0];
  } else if (type === 'MultiLineString') {
    turf.getCoords(geojson).forEach(line => coords = coords.concat(line));
  } else if (type === 'MultiPolygon') {
    turf.getCoords(geojson).forEach(polygon => coords = coords.concat(polygon[0]));
  }
  return coords;
});



function getGeometryTypeLabel(type) {
  switch (type) {
    case 'Point': return 'Punto';
    case 'LineString':
    case 'MultiLineString': return 'Línea';
    case 'Polygon':
    case 'MultiPolygon': return 'Polígono';
    default: return type;
  }
}

function toggleAccordion() {
  isAccordionOpen.value = !isAccordionOpen.value;
  // Emit feature-selected event when the header is clicked
  emit('feature-selected', props.feature);
}

function selectVertex(vertex) {
  // Emit vertex-selected event with the vertex coordinates
  emit('vertex-selected', vertex);
}

// Optional: Function to set selected state from parent (e.g., map click)
// defineExpose({ setSelected });
// function setSelected(value) {
//   isSelected.value = value;
// }
</script>

<style scoped>
.feature-item {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.feature-item.is-selected {
  border-color: #007bff;
  box-shadow: 0 0 8px rgba(0, 123, 255, 0.5);
}

.feature-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.feature-header:hover {
  background-color: #f0f0f0;
}

.feature-icon {
  font-size: 1.2em;
  margin-right: 10px;
  color: #3388ff; /* Azul similar al de los objetos del mapa */
}

.feature-name {
  font-weight: bold;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feature-value {
  font-size: 0.9em;
  color: #555;
  margin-left: 10px;
  white-space: nowrap;
}

.accordion-arrow {
  margin-left: 10px;
  font-size: 0.8em;
  transition: transform 0.2s ease;
}

.feature-details {
  padding: 10px 12px;
  background-color: #fdfdfd;
  border-top: 1px solid #eee;
}

.data-summary {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee; /* Subtle separator */
}

.vertices-list ul {
  list-style: none;
  padding-left: 15px;
  margin-top: 5px;
}

.vertices-list li {
  font-family: monospace;
  font-size: 0.9em;
  color: #333;
  padding: 3px 0;
  cursor: pointer;
}

.vertices-list li:hover {
  background-color: #e6f7ff;
  color: #0056b3;
}
</style>
