# HOJA DE RUTA DEL PROYECTO: PLATAFORMA GIS SAAS (v4.0)

**Última Actualización:** 12 de agosto de 2025

## FASES COMPLETADAS

*   **[✓] FASE 1: Cimientos y MVP:** Autenticación, gestión de proyectos y navegación robustas.
*   [✓] **FASE 2: Espacio de Trabajo del Mapa:** Layout profesional, renderizado estable de Leaflet y herramientas de dibujo `leaflet-draw` integradas.
*   [✓] **FASE 3: Persistencia de Datos:** Ciclo CRUD completo de geometrías sincronizado con Firestore.
*   **[✓] FASE 4: Lógica de Negocio y Exportación:** Visualización de datos calculados, atributos personalizables (nombre) y un motor de exportación modular (GeoJSON, CSV, KML).
*   **[✓] FASE 5 (Parcial): Mejoras de UX:**
    *   [✓] Barra de navegación unificada con "breadcrumb" (Mis Proyectos / Nombre del Proyecto).
    *   [✓] Guardado y carga del último estado del mapa (zoom y centro) por proyecto.

---

## PRÓXIMOS PASOS (BACKLOG)

*   **Opción A (Pulido de Interfaz):**
    *   [ ] **Corregir bug de layout:** Solucionar el problema de la barra de herramientas de dibujo que "salta" al activarse.
    *   [ ] **Tabla de exportación interactiva:** Hacer que las filas de la tabla modal sean clicables y que, al hacer clic, el mapa se centre y resalte el `feature` correspondiente.

*   **Opción B (Relevamiento de Campo):**
    *   [ ] Implementar el modo de relevamiento con **crosshair** para la captura de datos en dispositivos móviles.

*   **Opción C (Enriquecimiento Final de Datos):**
    *   [ ] Añadir coordenadas **UTM** y **Elevación** a la previsualización de exportación.

*   **Opción D (Acabados Finales):**
    *   [ ] Completar la exportación a **XLS**.
    *   [ ] Implementar la **verificación de correo electrónico** y el inicio de sesión con **Google**.

---

## NOTAS

*   **Prioridad:** La prioridad de las opciones A, B, C, D se definirá en la próxima reunión.
*   **Despliegue:** El despliegue se realiza automáticamente al hacer `git push` a `main`.

---
**Última Actualización:** 12 de agosto de 2025
**Estado:** En progreso
---