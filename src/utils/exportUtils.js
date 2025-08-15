// src/utils/exportUtils.js

import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as turf from '@turf/turf';
import proj4 from 'proj4';

/**
 * Convierte coordenadas geográficas (Lat, Lon) a UTM.
 * @param {number} lat - Latitud.
 * @param {number} lon - Longitud.
 * @returns {object} Un objeto con utmX, utmY, y utmZone.
 */
function convertToUTM(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return { utmX: 'N/A', utmY: 'N/A', utmZone: 'N/A' };
  }
  const zone = Math.floor((lon + 180) / 6) + 1;
  const isSouth = lat < 0;
  
  // Definición de la proyección UTM para la zona calculada
  const utmProj = `+proj=utm +zone=${zone} ${isSouth ? '+south' : ''} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;

  // Definición de la proyección de origen (WGS84)
  const wgs84Proj = 'EPSG:4326';

  // Registrar la definición de la proyección si no existe
  if (!proj4.defs(`EPSG:32${isSouth ? '7' : '6'}${zone}`)) {
      proj4.defs(`EPSG:32${isSouth ? '7' : '6'}${zone}`, utmProj);
  }

  try {
    const [utmX, utmY] = proj4(wgs84Proj, `EPSG:32${isSouth ? '7' : '6'}${zone}`, [lon, lat]);
    return {
      utmX: utmX.toFixed(2),
      utmY: utmY.toFixed(2),
      utmZone: `${zone}${isSouth ? 'S' : 'N'}`,
    };
  } catch (error) {
    console.error("Error en la conversión a UTM:", error);
    return { utmX: 'Error', utmY: 'Error', utmZone: 'Error' };
  }
}


/**
 * Obtiene todas las features de un proyecto desde Firestore.
 * @param {string} projectId - El ID del proyecto.
 * @returns {Promise<object>} Una FeatureCollection de GeoJSON.
 */
export async function getProjectFeatures(projectId) {
  const db = getFirestore();
  const featuresCollectionRef = collection(db, 'projects', projectId, 'features');
  const querySnapshot = await getDocs(featuresCollectionRef);

  const features = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const feature = JSON.parse(data.geometry);
    
    if (!feature.properties) {
      feature.properties = {};
    }
    feature.properties.firestore_id = doc.id;
    feature.properties.name = data.name;

    features.push(feature);
  });

  return {
    type: 'FeatureCollection',
    features: features
  };
}

/**
 * Enriquece una FeatureCollection con datos calculados.
 * @param {object} featureCollection - La FeatureCollection de GeoJSON.
 * @returns {object} La FeatureCollection enriquecida.
 */
export function enrichFeatures(featureCollection) {
  const enrichedFeatures = featureCollection.features.map(feature => {
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      feature.properties.area_m2 = turf.area(feature).toFixed(2);
    } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      feature.properties.longitud_m = turf.length(feature, { units: 'meters' }).toFixed(2);
    }
    return feature;
  });

  return {
    ...featureCollection,
    features: enrichedFeatures
  };
}

/**
 * Aplana una FeatureCollection a un array de filas por vértice, enriqueciendo con datos UTM.
 * @param {object} enrichedCollection - La FeatureCollection enriquecida.
 * @returns {Array<object>} Un array de objetos, donde cada objeto es una fila.
 */
export function flattenFeatures(enrichedCollection) {
  const flattened = [];
  let pointFeatureCounter = 0; // Contador para puntos
  const geometryTypeMap = {
    'Polygon': 'Polígono',
    'LineString': 'Línea',
    'Point': 'Punto',
  };

  enrichedCollection.features.forEach(feature => {
    const tipoGeometriaTraducido = geometryTypeMap[feature.geometry.type] || feature.geometry.type;

    if (feature.geometry.type === 'Point') {
      pointFeatureCounter++;
    }

    let coordinates = [];
    switch (feature.geometry.type) {
      case 'Point':
        coordinates.push(feature.geometry.coordinates);
        break;
      case 'LineString':
        coordinates = feature.geometry.coordinates;
        break;
      case 'Polygon':
        coordinates = feature.geometry.coordinates[0]; // Anillo exterior
        break;
    }

    coordinates.forEach((coord, index) => {
      const lat = coord[1];
      const lon = coord[0];
      const utm = convertToUTM(lat, lon);

      flattened.push({
        'Nombre Forma': feature.properties.name || 'Sin nombre',
        'Tipo Geometría': tipoGeometriaTraducido,
        'Vértice/Punto Nº': feature.geometry.type === 'Point' ? pointFeatureCounter : index + 1,
        'Latitud': lat,
        'Longitud': lon,
        'UTMX': utm.utmX,
        'UTMY': utm.utmY,
        'Zona UTM': utm.utmZone,
        'Elevacion (m)': '0', // Valor temporal
      });
    });
  });
  return flattened;
}

/**
 * Formatea una FeatureCollection como un string GeoJSON.
 * @param {object} enrichedCollection - La FeatureCollection enriquecida.
 * @returns {string} El string en formato GeoJSON.
 */
export function formatAsGeoJSON(enrichedCollection) {
  return JSON.stringify(enrichedCollection, null, 2);
}

/**
 * Formatea datos aplanados como un string CSV.
 * @param {Array<object>} flattenedData - El array de filas.
 * @returns {string} El string en formato CSV.
 */
export function formatAsCSV(flattenedData) {
  if (!flattenedData || flattenedData.length === 0) {
    return '';
  }

  const headers = Object.keys(flattenedData[0]).join(',');

  const rows = flattenedData.map(row => {
    const values = Object.values(row).map(val => {
      const str = String(val);
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    return values.join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Formatea una FeatureCollection como un string KML.
 * @param {object} enrichedCollection - La FeatureCollection enriquecida.
 * @returns {string} El string en formato KML.
 */
export function formatAsKML(enrichedCollection) {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
`;
    const kmlFooter = `  </Document>
</kml>`;

    const placemarks = enrichedCollection.features.map(feature => {
        const name = feature.properties.name || 'Sin nombre';
        const geometry = feature.geometry;
        let placemarkBody = '';

        try {
            switch (geometry.type) {
                case 'Point':
                    const pointCoords = `${geometry.coordinates[0]},${geometry.coordinates[1]},0`;
                    placemarkBody = `<Point><coordinates>${pointCoords}</coordinates></Point>`;
                    break;
                case 'LineString':
                    const lineCoords = geometry.coordinates.map(c => `${c[0]},${c[1]},0`).join(' ');
                    placemarkBody = `<LineString><coordinates>${lineCoords}</coordinates></LineString>`;
                    break;
                case 'Polygon':
                    const polyCoords = geometry.coordinates[0].map(c => `${c[0]},${c[1]},0`).join(' ');
                    placemarkBody = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${polyCoords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
                    break;
                default:
                    return '';
            }
        } catch (e) {
            console.error(`Error converting feature ${name} to KML:`, e);
            return '';
        }

        return `    <Placemark>
      <name>${name}</name>
      ${placemarkBody}
    </Placemark>`;
    }).join('\n');

    return kmlHeader + placemarks + '\n' + kmlFooter;
}


/**
 * Orquesta el proceso de exportación completo.
 * @param {string} projectId - El ID del proyecto.
 * @param {string} format - El formato deseado ('geojson', 'kml', 'csv').
 * @param {string} projectName - El nombre del proyecto para el archivo.
 */
export async function exportProject(projectId, format, projectName = 'export') {
    console.log(`Iniciando exportación para el proyecto ${projectId} en formato ${format}...`);

    try {
        const features = await getProjectFeatures(projectId);
        const enriched = enrichFeatures(features);

        let fileContent = '';
        let fileName = '';
        let contentType = '';

        switch (format) {
            case 'geojson':
                fileContent = formatAsGeoJSON(enriched);
                fileName = `${projectName}.geojson`;
                contentType = 'application/json';
                break;
            case 'kml':
                fileContent = formatAsKML(enriched);
                fileName = `${projectName}.kml`;
                contentType = 'application/vnd.google-earth.kml+xml';
                break;
            case 'csv':
                const flattened = flattenFeatures(enriched);
                const flattenedWithRowNumbers = flattened.map((row, index) => ({
                    num_registro: index + 1, // Global sequential number for each row
                    ...row
                }));
                fileContent = formatAsCSV(flattenedWithRowNumbers);
                fileName = `${projectName}.csv`;
                contentType = 'text/csv;charset=utf-8;';
                break;
            default:
                console.error('Formato de exportación no soportado:', format);
                return;
        }

        if (fileContent) {
            downloadFile(fileContent, fileName, contentType);
            console.log('Exportación completada con éxito.');
        }
    } catch (error) {
        console.error('Ocurrió un error durante la exportación:', error);
        alert('No se pudo completar la exportación. Revise la consola para más detalles.');
    }
}

export function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

