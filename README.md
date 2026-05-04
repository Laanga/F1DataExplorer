# F1 Data Explorer

Frontend interactivo para explorar datos de Formula 1 por temporada. La app combina calendario, clasificaciones, pilotos, constructores y resultados de sesiones en una experiencia visual construida con React, Vite, Tailwind CSS y GSAP.

Repositorio: [github.com/Laanga/F1DataExplorer](https://github.com/Laanga/F1DataExplorer)

## Estado Actual

El proyecto compila como SPA de Vite y está preparado para desplegarse en Vercel. Actualmente no consume FastF1 directamente desde el frontend; los datos llegan desde APIs públicas HTTP:

- **OpenF1**: sesiones, meetings, pilotos por sesión, resultados y posiciones.
- **Jolpica / Ergast compatible API**: clasificaciones, calendario, pilotos y datos históricos.
- **Assets locales**: fotos de pilotos y logos de equipos en `public/`.

## Stack

- React 18
- Vite 5
- React Router 6
- Tailwind CSS 3
- GSAP + ScrollTrigger
- Lenis para scroll suave
- Axios para peticiones HTTP
- Lucide React para iconografía
- Vercel Analytics

## Funcionalidades

- **Inicio**: hero visual, podio del campeonato, líder actual, progreso de temporada y accesos rápidos.
- **Pilotos**: parrilla de pilotos, cards visuales por equipo y modal con métricas de temporada.
- **Equipos**: clasificación de constructores, logos, colores de equipo y alineación de pilotos.
- **Carreras**: calendario en formato timeline, estados completado/pendiente, navegación por rondas y modal de sesiones.
- **Estadísticas**: ranking de pilotos, constructores, próximos Grandes Premios e indicadores competitivos.

## Arquitectura

```text
src/
  components/
    layout/         Navbar
    pilotos/        Cards de piloto
    ui/             Loader, fondo animado, modal de carrera
  contexts/         Temporada seleccionada
  hooks/            Carga async con AbortController
  pages/            Vistas principales de la app
  services/
    api/            Servicios por dominio
    config/         URLs y constantes de API
    utils/          Caché local y rate limiting
  utils/            Formateo, fechas, flags, colores y assets
```

El flujo de datos pasa por `src/services/openf1Service.js`, que funciona como fachada pública sobre servicios especializados. La app cachea respuestas en `localStorage`, deduplica carreras/meetings entre fuentes y usa fallbacks cuando una fuente no tiene datos completos.

## Calidad y Verificación

```bash
npm install
npm run lint
npm run build
npm audit --omit=dev
```

Estado actual:

- `npm run lint`: pasa sin errores.
- `npm run build`: pasa correctamente.
- `npm audit --omit=dev`: 0 vulnerabilidades de producción.
- React Doctor: 90/100 tras limpieza inicial.

Quedan advertencias no bloqueantes en React Doctor relacionadas sobre todo con tamaño de componentes, estado agrupable, gradientes decorativos y refactors de arquitectura.

## Limitaciones Conocidas

- No hay backend propio ni integración directa con FastF1.
- No hay tests unitarios ni e2e todavía.
- Algunas páginas siguen siendo demasiado grandes y mezclan UI, estado, transformación de datos y animaciones.
- Las visualizaciones actuales son correctas, pero todavía no explotan telemetría avanzada ni análisis por vuelta.
- La temporada se calcula automáticamente según fecha local; no hay selector histórico en la UI.

## Roadmap Técnico

- Extraer `Pilotos`, `Carreras`, `Equipos`, `Estadisticas` y `RaceModal` en componentes y hooks más pequeños.
- Añadir tests con Vitest y Playwright.
- Migrar la capa de datos a TanStack Query o una abstracción equivalente.
- Tipar contratos de API con TypeScript o Zod.
- Añadir visualizaciones de mayor valor: evolución por vuelta, stints, neumáticos, gaps entre compañeros, pit stops y ritmo medio.
- Sincronizar filtros y tabs con URL para compartir vistas concretas.
- Completar accesibilidad de modales con focus trap y navegación de tabs más robusta.

## Instalación

```bash
git clone https://github.com/Laanga/F1DataExplorer.git
cd F1DataExplorer
npm install
npm run dev
```

La app arranca por defecto en `http://localhost:3000`.

## Autor

Álvaro Langa

- [LinkedIn](https://www.linkedin.com/in/%C3%A1lvaro-langa-dev/)
- [GitHub](https://github.com/Laanga)
- [Portfolio](https://alvarolangadev.vercel.app)
