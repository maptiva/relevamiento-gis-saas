<template>
  <div>
    <div class="map-view-wrapper">
      <!-- La barra de navegación superior ha sido eliminada -->
      
      <div class="toolbar-horizontal">
        <div class="drawing-tools">
          <button @click="startDrawing('polygon')" class="action-button">Dibujar Polígono</button>
          <button @click="startDrawing('polyline')" class="action-button">Dibujar Línea</button>
          <button @click="startDrawing('circlemarker')" class="action-button">Dibujar Marcador</button>
          <button @click="startDrawing('edit')" class="action-button edit-button">Editar Formas</button>
          <button @click="startDrawing('delete')" class="action-button delete-button">Borrar Formas</button>
          <!-- New Cancel button -->
          <button v-if="isEditingOrDrawing" @click="saveChanges" class="action-button save-button">Guardar</button>
          <button v-if="isEditingOrDrawing" @click="cancelDrawingOrEditing" class="action-button cancel-button">Cancelar</button>
        </div>
        <button @click="locateUser" class="action-button locate-button"><font-awesome-icon icon="location-crosshairs" /> Localizar</button>
        
        <button @click="openExportModal" class="action-button">Exportar Objetos</button>
      </div>
      <div class="main-content">
        <LayersPanel
          :features="projectFeaturesList"
          :selected-feature-id="selectedFeatureIdFromMap"
          @feature-selected="zoomToFeature"
          @vertex-selected="zoomToVertex"
        />
        <main class="map-container" ref="mapElement"></main>
      </div>
    </div>

    <!-- Modal de Previsualización de Exportación -->
    <ExportPreviewModal
      v-if="showExportModal"
      :flattenedFeatures="featuresToExport.flattened"
      :enrichedFeatures="featuresToExport.enriched"
      :projectName="projectName"
      @close="showExportModal = false"
    />

    <!-- Modal para nombrar la nueva forma -->
    <NameFeatureModal
      :show="showNameModal"
      @confirmed="handleNameConfirmed"
      @cancelled="handleNameCancelled"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, inject, watchEffect, nextTick, markRaw, toRaw } from 'vue';
import { useRoute } from 'vue-router';
import { getFirestore, doc, getDoc, collection, addDoc, query, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import * as turf from '@turf/turf';
import { exportProject as downloadExport } from '../utils/exportUtils';
import ExportPreviewModal from '../components/ExportPreviewModal.vue';
import LayersPanel from '../components/LayersPanel.vue';
import NameFeatureModal from '../components/NameFeatureModal.vue';

const route = useRoute();
const projectName = ref('Cargando...');
const currentProjectName = inject('projectName'); // Inject the provided project name
const mapElement = ref(null);

const showExportModal = ref(false);
const featuresToExport = ref({ flattened: [], enriched: {} });
const map = ref(null); // Make map a reactive ref, but we'll use markRaw inside
const drawControl = ref(null); // Make drawControl a reactive ref
const drawnItems = ref(null); // Make drawnItems reactive for easier management
const projectFeaturesList = ref([]);
const selectedFeatureIdFromMap = ref(null);

// Drawing and Editing Handlers
const polygonDrawer = ref(null);
const polylineDrawer = ref(null);
const markerDrawer = ref(null);
const editHandler = ref(null);
const deleteHandler = ref(null);

const isEditingOrDrawing = ref(false);

const showNameModal = ref(false);
const tempDrawnLayer = ref(null);

let unsubscribeFirestore = null; // Variable para almacenar la función de desuscripción de Firestore

const leafletLayersMap = ref(new Map()); // Map to store Leaflet layers by feature ID

// Define common styles for drawn features
const shapeOptions = {
  color: '#3388ff',       // Light blue (Leaflet default)
  weight: 2,
  fillColor: '#3388ff',
  fillOpacity: 0.3
};

const circleMarkerStyle = {
  radius: 8,
  fillColor: "#3388ff",
  color: "#3388ff",
  weight: 3,
  opacity: 1,
  fillOpacity: 0.3
};

// Override Leaflet Popup prototype to prevent null errors on zoom after close
L.Popup.prototype._animateZoom = function (e) {
  if (!this._map) {
    return;
  }
  const pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
  const anchor = this._getAnchor();
  L.DomUtil.setPosition(this._container, pos.add(anchor));
};

// Helper function to get geometry type label (duplicated from FeatureItem.vue)
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

// Helper function to calculate value (duplicated from FeatureItem.vue)
function calculateFeatureValue(feature) {
  const geojson = feature;
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
}

// Function to generate HTML content for a popup
function generatePopupContent(feature) {
  const name = feature.properties.name || 'Sin nombre';
  const typeLabel = getGeometryTypeLabel(feature.geometry.type);
  const value = calculateFeatureValue(feature);
  const type = turf.getType(feature); // Get type for dynamic label

  let valueLabel = 'Valor:';
  switch (type) {
    case 'Point':
      valueLabel = 'Coordenadas:';
      break;
    case 'LineString':
    case 'MultiLineString':
      valueLabel = 'Longitud:';
      break;
    case 'Polygon':
    case 'MultiPolygon':
      valueLabel = 'Área:';
      break;
  }

  return `
    <div>
      <strong style="font-weight: 900; font-size: 1.1em;">${name}</strong><br>
      <strong>Tipo:</strong> ${typeLabel}<br>
      <strong>${valueLabel}</strong> ${value}
    </div>
  `;
}

// Function to create and bind popup robustly
function createAndBindPopup(layer) {
  if (!layer.feature) return;
  const popupContent = generatePopupContent(layer.feature);
  layer.bindPopup(popupContent);
}

// Function to bind feature click event, with nextTick for new features
function bindFeatureClickEvent(layer) {
  layer.on('click', async (e) => {
    await nextTick();
    selectedFeatureIdFromMap.value = layer.feature.id;
    layer.openPopup(); // Open popup on map click
  });
}

// Lógica de exportación (abre modal)
import { getProjectFeatures, enrichFeatures, flattenFeatures } from '../utils/exportUtils';

async function openExportModal() {
  try {
    const features = await getProjectFeatures(route.params.id);
    const enriched = enrichFeatures(features);
    const flattened = flattenFeatures(enriched);

    const flattenedWithRowNumbers = flattened.map((row, index) => ({
      num_registro: index + 1,
      ...row
    }));

    featuresToExport.value = {
      flattened: flattenedWithRowNumbers,
      enriched: enriched
    };
    showExportModal.value = true;
  } catch (error) {
    console.error('Error al preparar datos para el modal de exportación:', error);
    alert('No se pudieron cargar los datos para la exportación. Revise la consola.');
  }
}

// Function to disable all drawing and editing handlers
function disableAllDrawingHandlers() {
  if (polygonDrawer.value && polygonDrawer.value.enabled()) polygonDrawer.value.disable();
  if (polylineDrawer.value && polylineDrawer.value.enabled()) polylineDrawer.value.disable();
  if (markerDrawer.value && markerDrawer.value.enabled()) markerDrawer.value.disable();
  if (editHandler.value && editHandler.value.enabled()) editHandler.value.disable();
  if (deleteHandler.value && deleteHandler.value.enabled()) deleteHandler.value.disable();
  isEditingOrDrawing.value = false; // Set to false when all are disabled
}

function saveChanges() {
  if (editHandler.value && editHandler.value.enabled()) {
    editHandler.value.save();
  }
  if (deleteHandler.value && deleteHandler.value.enabled()) {
    deleteHandler.value.save();
  }
  disableAllDrawingHandlers(); // Disable handlers after saving
}

function cancelDrawingOrEditing() {
  // Revert changes if in edit or delete mode
  if (editHandler.value && editHandler.value.enabled()) {
    editHandler.value.revertLayers();
  }
  if (deleteHandler.value && deleteHandler.value.enabled()) {
    deleteHandler.value.revertLayers();
  }
  disableAllDrawingHandlers(); // This will disable the active tool and set isEditingOrDrawing to false
}

function zoomToFeature(feature) {
  if (!map.value) return;

  const geojson = feature;
  const type = turf.getType(geojson);

  if (type === 'Point') {
    const coords = turf.getCoord(geojson);
    toRaw(map.value).setView([coords[1], coords[0]], 16); // Zoom to point
  } else if (type === 'LineString' || type === 'MultiLineString' || type === 'Polygon' || type === 'MultiPolygon') {
    const layer = L.geoJSON(geojson);
    toRaw(map.value).fitBounds(layer.getBounds()); // Fit bounds for lines and polygons
  }

  // Find the corresponding Leaflet layer and open its popup
  toRaw(drawnItems.value).eachLayer((layer) => {
    if (layer.feature && layer.feature.id === geojson.id) {
      layer.openPopup();
    }
  });
}

function zoomToVertex(vertex) {
  if (!map.value) return;
  toRaw(map.value).setView([vertex[1], vertex[0]], 18); // Zoom to vertex with higher zoom
}

async function saveMapState() {
  if (!map.value || !route.params.id) return;

  const currentCenter = toRaw(map.value).getCenter();
  const currentZoom = toRaw(map.value).getZoom();

  const db = getFirestore();
  const projectRef = doc(db, 'projects', route.params.id);

  try {
    await updateDoc(projectRef, {
      lastZoom: currentZoom,
      lastCenter: { lat: currentCenter.lat, lng: currentCenter.lng }
    });
    console.log('Estado del mapa guardado en Firestore.');
  } catch (error) {
    console.error('Error al guardar el estado del mapa:', error);
  }
}

const locateUser = () => {
  console.log('Localizando usuario...');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Ubicación obtenida:', position);
        const { latitude, longitude } = position.coords;
        if (map.value) {
          toRaw(map.value).setView([latitude, longitude], 16); // Zoom level 16
          L.marker([latitude, longitude]).addTo(toRaw(map.value))
            .bindPopup('Estás aquí').openPopup();
        } else {
          console.error('Map instance is not available.');
        }
      },
      (error) => {
        console.error('Error al obtener la ubicación:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    // toast.error('La geolocalización no es soportada por tu navegador.'); // This line was commented out in the original working version
  }
};

const handleEscapeKey = (e) => {
  if (e.key === 'Escape') {
    cancelDrawingOrEditing();
  }
};

const handleNameConfirmed = async (name) => {
  if (!tempDrawnLayer.value) return;

  const originalLayer = tempDrawnLayer.value;
  toRaw(map.value).removeLayer(originalLayer); // Remove the temporary layer from the map
  const geojson = originalLayer.toGeoJSON();

  // Ensure properties object exists
  if (!geojson.properties) {
    geojson.properties = {};
  }
  geojson.properties.name = name;

  const db = getFirestore();

  try {
    const featuresCollection = collection(db, 'projects', route.params.id, 'features');
    // The onSnapshot listener will pick up this new document and update projectFeaturesList
    await addDoc(featuresCollection, {
      geometry: JSON.stringify(geojson),
      name: name
    });
    console.log('Geometría guardada en Firestore. El mapa se actualizará vía onSnapshot.');
  } catch (error) {
    console.error('Error al guardar la geometría:', error);
  } finally {
    tempDrawnLayer.value = null;
    showNameModal.value = false;
    toRaw(map.value).invalidateSize(); // Fix any post-add delays
  }
};

const handleNameCancelled = () => {
  if (tempDrawnLayer.value) {
    // If the user cancels, remove the temporary layer from the map if it was added (it shouldn't be, but as a safeguard)
    if (toRaw(map.value).hasLayer(tempDrawnLayer.value)) {
      toRaw(map.value).removeLayer(tempDrawnLayer.value);
    }
  }
  tempDrawnLayer.value = null;
  showNameModal.value = false;
};

// Ciclo de vida del componente
onMounted(async () => {
  const db = getFirestore();
  const projectRef = doc(db, 'projects', route.params.id);
  const projectSnap = await getDoc(projectRef);

  let initialCenter = [-32.94, -60.63]; // Default Rosario
  let initialZoom = 13; // Default zoom

  if (projectSnap.exists()) {
    projectName.value = projectSnap.data().name;
    currentProjectName.value = projectSnap.data().name;

    const data = projectSnap.data();
    if (data.lastZoom !== undefined && data.lastCenter !== undefined) {
      initialZoom = data.lastZoom;
      initialCenter = [data.lastCenter.lat, data.lastCenter.lng];
      console.log('Cargando estado del mapa guardado:', initialCenter, initialZoom);
    } else {
      console.log('No se encontró estado del mapa guardado, usando valores por defecto.');
    }
  } else {
    projectName.value = 'Proyecto no encontrado';
    currentProjectName.value = null;
    console.log('Proyecto no encontrado, usando valores por defecto.');
  }

  if (mapElement.value) {
    // Use markRaw to prevent Vue from proxying the map instance
    map.value = markRaw(L.map(mapElement.value).setView(initialCenter, initialZoom));

    // Add event listeners for map state saving
    map.value.on('zoomend', () => {
      saveMapState();
      map.value.invalidateSize(); // Fix delays on zoom
    });
    map.value.on('moveend', () => {
      saveMapState();
      map.value.invalidateSize(); // Fix delays on pan
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const esriSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    osmLayer.addTo(map.value);

    const baseMaps = {
      "OpenStreetMap": osmLayer,
      "Satélite": esriSatLayer
    };

    L.control.layers(baseMaps).addTo(map.value);

    // Geosearch control
    const provider = new OpenStreetMapProvider();
    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar',
      searchLabel: 'Buscar un lugar...',
      showMarker: true,
      marker: {
        icon: new L.Icon.Default(),
        draggable: false,
      },
    });
    map.value.addControl(searchControl);

    // Initialize drawnItems as FeatureGroup with markRaw
    drawnItems.value = markRaw(L.featureGroup().addTo(map.value));

    // Initialize drawing handlers
    polygonDrawer.value = new L.Draw.Polygon(map.value, { shapeOptions });
    polylineDrawer.value = new L.Draw.Polyline(map.value, { shapeOptions });
    markerDrawer.value = new L.Draw.CircleMarker(map.value, { shapeOptions: circleMarkerStyle });

    // Initialize editing handlers
    editHandler.value = new L.EditToolbar.Edit(map.value, { featureGroup: drawnItems.value });
    deleteHandler.value = new L.EditToolbar.Delete(map.value, { featureGroup: drawnItems.value });

    // Real-time sync with Firestore using onSnapshot
    const featuresCollection = collection(db, 'projects', route.params.id, 'features');
    const q = query(featuresCollection);
    unsubscribeFirestore = onSnapshot(q, async (snapshot) => {
      projectFeaturesList.value = snapshot.docs.map(doc => {
        const featureData = doc.data();
        const feature = JSON.parse(featureData.geometry);
        feature.properties = feature.properties || {};
        feature.properties.name = featureData.name;
        feature.id = doc.id;
        return feature;
      });
    });

    // Use watchEffect to reactively update layers based on projectFeaturesList changes
    watchEffect(async () => {
      if (!map.value || !drawnItems.value) return; // Ensure map and drawnItems are initialized

      const currentFeatureIds = new Set(projectFeaturesList.value.map(f => f.id));
      const layersToRemove = [];

      // Identify layers to remove (features no longer in projectFeaturesList)
      toRaw(drawnItems.value).eachLayer(layer => {
        if (layer.feature && !currentFeatureIds.has(layer.feature.id)) {
          layersToRemove.push(layer);
        }
      });

      layersToRemove.forEach(layer => {
        toRaw(drawnItems.value).removeLayer(layer);
        leafletLayersMap.value.delete(layer.feature.id);
      });

      // Identify layers to add/update
      projectFeaturesList.value.forEach(feature => {
        if (!leafletLayersMap.value.has(feature.id)) {
          // Add new feature
          L.geoJSON(feature, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, circleMarkerStyle),
            onEachFeature: (f, layer) => {
              layer.feature = f;
              bindFeatureClickEvent(layer);
              createAndBindPopup(layer);
              toRaw(drawnItems.value).addLayer(layer);
              leafletLayersMap.value.set(feature.id, layer); // Store reference to the layer
            }
          });
        } else {
          // Feature exists, check for updates (simplified for now, just re-add if geometry changed)
          // A more robust solution would compare geometries and update the existing layer
          // For now, if a feature exists in Firestore, we assume its geometry might have changed
          // and we re-add it to ensure consistency. This might still cause temporary visual glitches.
          // A better approach for updates would be to use layer.setLatLngs, layer.setLatLng, etc.
          // based on geometry type, but that's more complex.
          const existingLayer = leafletLayersMap.value.get(feature.id);
          if (JSON.stringify(existingLayer.feature.geometry) !== JSON.stringify(feature.geometry)) {
            toRaw(drawnItems.value).removeLayer(existingLayer);
            L.geoJSON(feature, {
              pointToLayer: (f, latlng) => L.circleMarker(latlng, circleMarkerStyle),
              onEachFeature: (f, layer) => {
                layer.feature = f;
                bindFeatureClickEvent(layer);
                createAndBindPopup(layer);
                toRaw(drawnItems.value).addLayer(layer);
                leafletLayersMap.value.set(feature.id, layer);
              }
            });
          }
        }
      });

      await nextTick(); // Wait for DOM/render cycle
      toRaw(map.value).invalidateSize(); // Fix any layout issues
    });

    map.value.on(L.Draw.Event.DELETED, async (event) => {
      event.layers.eachLayer(async (layer) => {
        const docId = layer.feature.id;
        if (docId) {
          try {
            const docRef = doc(db, 'projects', route.params.id, 'features', docId);
            await deleteDoc(docRef);
            console.log('Geometría eliminada de Firestore');
          } catch (error) {
            console.error('Error al eliminar la geometría:', error);
          }
        }
      });
    });

    map.value.on(L.Draw.Event.CREATED, async (event) => {
      tempDrawnLayer.value = event.layer;
      showNameModal.value = true;
    });

    map.value.on(L.Draw.Event.EDITED, async (event) => {
      const layers = event.layers;
      layers.eachLayer(async (layer) => {
        const docId = layer.feature.id;
        if (docId) {
          try {
            const docRef = doc(db, 'projects', route.params.id, 'features', docId);
            const updatedGeoJSON = layer.toGeoJSON();
            await updateDoc(docRef, { geometry: JSON.stringify(updatedGeoJSON) });
            console.log('Geometría editada y guardada en Firestore');
          } catch (error) {
            console.error('Error al editar la geometría:', error);
          }
        }
      });
    });
  }

  // Escape key listener
  window.addEventListener('keydown', handleEscapeKey);
});

onBeforeUnmount(() => {
  if (map.value) {
    // Remove all event listeners
    map.value.off();
    map.value.remove();
  }
  // Remove Escape key listener
  window.removeEventListener('keydown', handleEscapeKey);

  // Unsubscribe from Firestore listener
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    console.log('Firestore listener unsubscribed.');
  }
});

function startDrawing(type) {
  if (!map.value) {
    console.error('Map not initialized.');
    return;
  }

  disableAllDrawingHandlers(); // Disable all before enabling new one

  switch (type) {
    case 'polygon':
      polygonDrawer.value.enable();
      isEditingOrDrawing.value = true;
      break;
    case 'polyline':
      polylineDrawer.value.enable();
      isEditingOrDrawing.value = true;
      break;
    case 'circlemarker':
      markerDrawer.value.enable();
      isEditingOrDrawing.value = true;
      break;
    case 'edit':
      editHandler.value.enable();
      isEditingOrDrawing.value = true;
      break;
    case 'delete':
      deleteHandler.value.enable();
      isEditingOrDrawing.value = true;
      break;
    default:
      console.warn('Unknown drawing type:', type);
  }
}
</script>

<style scoped>
.map-view-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px); /* Ajusta la altura para descontar la barra de navegación superior */
  gap: 10px; /* Añade espacio entre la barra de herramientas y el contenido */
}

.search-and-locate-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  gap: 5px;
  align-items: center;
}

/* Estilos de la barra de navegación antigua eliminados */

.project-title {
  font-size: 1.2em;
  margin: 0;
  color: white;
  font-weight: bold;
}

.toolbar-horizontal {
  position: sticky;
  top: 70px; /* Adjust to be below the main navbar */
  z-index: 1010; /* Above map, below navbar */
  background-color: #555;
  padding: 10px 20px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Add subtle shadow for separation */
}

.drawing-tools {
  display: flex;
  gap: 10px;
}

.main-content {
  display: flex;
  flex-direction: row; /* Changed from column to row */
  flex-grow: 1;
  overflow: hidden;
  gap: 10px;
  padding: 10px;
}


.action-button {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-button:hover {
  background-color: #0056b3;
}

.save-button {
  background-color: #28a745; /* Green color */
}

.save-button:hover {
  background-color: #218838;
}

.edit-button,
.delete-button {
  background-color: #ff9800; /* Orange */
}

.edit-button:hover,
.delete-button:hover {
  background-color: #f57c00; /* Darker Orange */
}

.cancel-button {
  background-color: #dc3545; /* Red */
}

.cancel-button:hover {
  background-color: #c82333; /* Darker Red */
}

.locate-button {
  background-color: #17a2b8; /* Teal color */
}

.locate-button:hover {
  background-color: #138496;
}

.locate-button i {
  margin-right: 5px;
}

.action-button i.fas,
.locate-button i.fas {
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important; /* For solid icons */
}

.kml-button {
    background-color: #4CAF50;
}

.kml-button:hover {
    background-color: #45a049;
}

.csv-button {
    background-color: #ff9800;
}

.csv-button:hover {
    background-color: #f57c00;
}

.map-container {
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Asegura que el mapa respete el borde redondeado */
}
</style>

<style>
.leaflet-top.leaflet-left {
  display: flex;
  flex-direction: row;
  gap: 5px; /* Space between controls */
  align-items: flex-start;
}

/* Global override for geosearch results */
.leaflet-control-geosearch .results > * {
  color: #333; /* Darker text for better contrast */
}

.leaflet-control-geosearch .results > .active,
.leaflet-control-geosearch .results > :hover {
  background-color: #e9e9e9; /* A slightly darker hover/active background */
}

.leaflet-control-geosearch form {
  box-shadow: 0 1px 7px rgba(0, 0, 0, 0.2); /* Add a more pronounced shadow */
}

.locate-control-button {
  background-color: white;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.locate-button-icon {
  font-size: 18px;
  color: #333;
}

.locate-control-button .fas {
  font-family: "Font Awesome 6 Free" !important;
  font-weight: 900 !important; /* For solid icons */
}
</style>