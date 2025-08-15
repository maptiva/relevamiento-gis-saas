<template>
  <div style="height: 100%; width: 100%">
    <l-map ref="map" v-model:zoom="zoom" :center="[-32.9477, -60.6304]">
      <l-tile-layer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>
    </l-map>
  </div>
</template>

<script setup>
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer } from "@vue-leaflet/vue-leaflet";
import { ref, onMounted, defineExpose, computed, watch } from "vue";
import { Icon } from 'leaflet';

// Arreglo para el problema de los íconos con Vite
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/dist/images/marker-icon-2x.png',
  iconUrl: 'leaflet/dist/images/marker-icon.png',
  shadowUrl: 'leaflet/dist/images/marker-shadow.png',
});

const zoom = ref(13);
const map = ref(null); // Referencia al componente LMap
const leafletMapInstance = ref(null); // Instancia real del mapa de Leaflet

watch(map, (newMapComponent) => {
  console.log('Watch: newMapComponent', newMapComponent);
  if (newMapComponent && newMapComponent.mapObject) {
    leafletMapInstance.value = newMapComponent.mapObject;
    console.log('Watch: Leaflet map instance (mapObject):', leafletMapInstance.value);
  } else {
    console.log('Watch: mapObject is not yet available or newMapComponent is null');
  }
}, { immediate: true });

onMounted(() => {
  console.log('onMounted: Leaflet map component ref:', map.value);
  if (map.value) {
    console.log('onMounted: Leaflet map instance (mapObject):', map.value.mapObject);
  }
});

defineExpose({
  leafletMap: leafletMapInstance // Exponer la instancia del mapa de Leaflet
});
</script>
<style scoped>
.leaflet-control-container .leaflet-top.leaflet-left {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 5px; /* Adjust as needed for spacing between controls */
}


</style>
