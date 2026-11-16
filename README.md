# NOTICIAS DIARIAS · Córdoba y Argentina

Aplicación periodística nueva, independiente de otros sitios. Next.js + TypeScript.

## Funciones
- Portada de noticias con fuentes identificadas y categorías Córdoba, Argentina, política, policiales, economía, deportes, mundo y espectáculos.
- Clima real de Córdoba Capital con mínimas/máximas, lluvia separada de riesgo de granizo y siete días de pronóstico.
- Fútbol masculino y femenino: Primera División, Primera Nacional, las cinco grandes ligas europeas y torneos femeninos; resultados, calendario de dos días pasados hasta cuatro futuros, estadísticas y tablas con proveedor deportivo.
- Ediciones editoriales de 08:00 y 18:00 a través de `content/editions.json`.

## Datos confiables
- Se omiten marcadores cuando falta la conexión deportiva; el tiempo usa Open-Meteo.
- El granizo se muestra como riesgo cualitativo cuando se detecta el código meteorológico correspondiente; no se inventa un porcentaje.
- Las publicaciones del chat NO se sincronizan automáticamente hasta conectar el flujo que escriba en GitHub.

## Desarrollo

```bash
npm install
npm run dev
```

Configurar `API_FOOTBALL_KEY` en Vercel para activar resultados en vivo. Esta clave nunca debe ir en el frontend.

## Despliegue

- **Sitio publicado:** https://noticiasdiarias-theta.vercel.app
- **Origen:** GitHub, rama `main`, vinculado al proyecto Vercel `noticiasdiarias`.
- Los cambios enviados a `main` se despliegan automáticamente a través de la integración Git de Vercel.
- **Datos deportivos en vivo:** pendientes de configurar `API_FOOTBALL_KEY` como variable de entorno del proyecto; sin esa clave no se muestran resultados ni estadísticas.
- **Ediciones ChatGPT:** se debe conectar un publicador que actualice `content/editions.json`; las ediciones conversacionales todavía no se transfieren solas.
