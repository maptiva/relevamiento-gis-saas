<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Previsualización de Exportación</h2>
        
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="col-nombre">Nombre Forma</th>
                <th class="col-tipo">Tipo Geometría</th>
                <th class="col-vertice">Vértice/Punto Nº</th>
                <th class="col-latlon">Latitud</th>
                <th class="col-latlon">Longitud</th>
                <th class="col-utm">UTMX</th>
                <th class="col-utm">UTMY</th>
                <th class="col-zona-utm">Zona UTM</th>
                <th class="col-elevacion">Elevacion (m)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in flattenedFeatures" :key="index">
                <td>{{ row['Nombre Forma'] }}</td>
                <td>{{ row['Tipo Geometría'] }}</td>
                <td>{{ row['Vértice/Punto Nº'] }}</td>
                <td>{{ row.Latitud.toFixed(6) }}</td>
                <td>{{ row.Longitud.toFixed(6) }}</td>
                <td>{{ row.UTMX }}</td>
                <td>{{ row.UTMY }}</td>
                <td>{{ row['Zona UTM'] }}</td>
                <td>{{ row['Elevacion (m)'] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="downloadGeoJSON" class="action-button">Descargar GeoJSON</button>
        <button @click="downloadCSV" class="action-button csv-button">Descargar CSV</button>
        <button @click="downloadKML" class="action-button kml-button">Descargar KML</button>
        <button @click="$emit('close')" class="action-button">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { formatAsGeoJSON, formatAsCSV, formatAsKML, downloadFile } from '../utils/exportUtils';

const props = defineProps({
  flattenedFeatures: {
    type: Array,
    required: true
  },
  enrichedFeatures: {
    type: Object,
    required: true
  },
  projectName: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close']);

const downloadGeoJSON = () => {
  const content = formatAsGeoJSON(props.enrichedFeatures);
  downloadFile(content, `${props.projectName}.geojson`, 'application/json');
};

const downloadCSV = () => {
  const content = formatAsCSV(props.flattenedFeatures);
  downloadFile(content, `${props.projectName}.csv`, 'text/csv;charset=utf-8;');
};

const downloadKML = () => {
  const content = formatAsKML(props.enrichedFeatures);
  downloadFile(content, `${props.projectName}.kml`, 'application/vnd.google-earth.kml+xml');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000; /* Ensure it's above the navbar */
}

.modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  border-top-left-radius: 10px; /* Explicitly set for clarity */
  border-top-right-radius: 10px; /* Explicitly set for clarity */
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  width: 95%;
  max-width: 1200px; /* Aumentado para dar más espacio a las nuevas columnas */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  color: #333;
  overflow: hidden; /* Added to ensure content respects border-radius */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
  margin-bottom: 20px;
  border-top-left-radius: 10px; /* Match parent's border-radius */
  border-top-right-radius: 10px; /* Match parent's border-radius */
}

.modal-header h2 {
  margin: 0;
  font-size: 1.6em;
  font-weight: 600;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 1.8em;
  font-weight: bold;
  cursor: pointer;
  color: #888;
  line-height: 1;
}

.close-button:hover {
  color: #000;
}

.modal-body {
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.table-container {
  max-height: calc(90vh - 200px); /* Altura calculada para dejar espacio a header/footer */
  overflow-y: auto;
  overflow-x: hidden; /* Ensure horizontal content is clipped */
  border: 1px solid #ddd;
  border-radius: 10px; /* Changed to match modal's border-radius */
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
  overflow: hidden; /* Ensure table content respects its own border-radius */
}

table th,
table td {
  border: 1px solid #e0e0e0;
  padding: 10px 12px;
  text-align: left;
  white-space: nowrap;
}

table th {
  background-color: #f7f7f7;
  font-weight: 600;
  /* position: sticky; */ /* Temporarily removed */
  /* top: 0; */ /* Temporarily removed */
  /* z-index: 1; */ /* Temporarily removed */
}

table thead {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  overflow: hidden;
}

/* --- Estilos para anchos de columna --- */
.col-nombre { width: 20%; }
.col-tipo { width: 12%; }
.col-vertice { width: 100px; text-align: center; }
.col-latlon { width: 15%; }
.col-utm { width: 15%; }
.col-zona-utm { width: 100px; text-align: center; }
.col-elevacion { width: 120px; text-align: center; }

table td:nth-child(3), /* Vértice */
table td:nth-child(8), /* Zona UTM */
table td:nth-child(9) { /* Elevación */
  text-align: center;
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 15px;
  border-top: 2px solid #f0f0f0;
  border-bottom-left-radius: 10px; /* Match modal-content's border-radius */
  border-bottom-right-radius: 10px; /* Match modal-content's border-radius */
}

.action-button {
  padding: 10px 22px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  color: white;
  background-color: #007bff;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.action-button:hover {
  opacity: 0.85;
}

.action-button:active {
    transform: scale(0.98);
}

.action-button.csv-button {
  background-color: #28a745; /* Verde para CSV */
}

.action-button.kml-button {
  background-color: #ff9800; /* Naranja para KML */
}
</style>
