import L from 'leaflet';

L.Control.LocateButton = L.Control.extend({
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom locate-control-button');
    container.title = 'Localizar mi ubicación';

    const text = L.DomUtil.create('span', 'locate-button-text');
    text.innerText = 'Locate';
    container.appendChild(text);

    L.DomEvent.on(container, 'click', function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const latlng = L.latLng(lat, lng);
            map.flyTo(latlng, 16); // Zoom level 16
            L.marker(latlng).addTo(map)
              .bindPopup("<b>Estás aquí</b>").openPopup();
          },
          () => {
            alert("No se pudo obtener tu ubicación.");
          }
        );
      } else {
        alert("La geolocalización no es soportada por este navegador.");
      }
    });

    return container;
  },

  onRemove: function(map) {
    // Nothing to do here
  }
});

L.control.locateButton = function(opts) {
  return new L.Control.LocateButton(opts);
}