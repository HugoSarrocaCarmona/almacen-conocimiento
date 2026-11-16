# Cuaderno IA y Ley

App de sesiones diarias para aprender cómo deben adaptar las empresas sus procesos (IA, automatizaciones y uso legítimo de datos) a la regulación vigente. Sustituye a *Entreno de Habilidades*. Sigue el método del vídeo de Psycuro (ver [METODOLOGIA.md](METODOLOGIA.md)).

- **App publicada (privada):** https://claude.ai/artifact/N3EPgH3Lw97WTuonbo2kZ2
- **Hora:** 19:00 todos los días. Hay un evento recurrente en Google Calendar y el hábito «Cuaderno IA y Ley» en Puertas Diarias.
- **Revisión de la regulación:** tarea programada «Revisión semanal del radar regulatorio», los domingos a las 9:54 (Europe/Madrid). Abre una sesión nueva que busca cambios, los contrasta en las fuentes oficiales y actualiza la base de datos de la app.

## Cómo funciona una sesión

| Duración | Pasos |
|---|---|
| 20 min | Pregunta → Lectura → Reconstruir → Comprobar → Enseñar → Gancho |
| 30 min | + Texto oficial (después de reconstruir) |
| 45 min | + Detector de humo (después de comprobar) |

Antes de la sesión está la **puerta de 2 minutos**: recuperar de memoria un gancho que toca repasar o, si todavía no hay, escribir lo que ya sabes de una pregunta. Los domingos se añade la **prueba del domingo**.

Claude actúa dentro de la página con la capacidad `sample` y usa tu cuenta de Claude. Recibe en cada llamada tu pregunta, tus ganchos y el **estado regulatorio verificado** del radar, y tiene instrucciones de no afirmar fechas ni vigencias que no estén ahí.

## Archivos

```
index.html        La app (HTML + JS sin dependencias). Se publica tal cual como artifact.
seed.json         Datos iniciales del radar, las novedades y el banco de preguntas (corte: 16-11-2026).
METODOLOGIA.md    El método del vídeo y cómo lo aplica cada parte de la app.
```

## Datos (capacidad `db` del artifact, solo lectura y escritura del propietario)

| Colección | Quién la escribe | Contenido |
|---|---|---|
| `radar/{id}` | Revisión semanal | Una ficha por norma: `titulo, corto, juris (UE/ES/CAT/GLOBAL), estado, estadoTxt, resumen, empresa, fechas[{f,t}], procesos[], fuente{t,url}, fuentes[], verificado, confianza, orden` |
| `novedades/{id}` | Revisión semanal | `fecha, juris, tipo, titulo, resumen, impacto, normas[], fuente` |
| `banco/{id}` | Revisión semanal | Preguntas de empresa: `texto, area, normas[], orden` |
| `meta/radar` | Revisión semanal | `ultimaRevision, proxima, resumen` |
| `meta/settings` | La app | `hora, ancla, puerta, minutos` |
| `questions/{id}` | La app | Tu cuaderno: `texto, area, normas, estado (activa/pendiente/respondida), sesiones, checks[]` |
| `sessions/{id}` | La app | Cada sesión: predicción, ficha (`plan`), reconstrucción, caso, nota, nota predicha (`conf`), explicación, gancho |
| `hooks/{id}` | La app | Ganchos con repaso espaciado: `texto, pista, area, due, ivl, reps[]` |
| `days/{fecha}` | La app | `puerta, sesion, min, domingo…` |

Áreas de proceso: `personas, clientes, marketing, decisiones, contenido, datos, proveedores, agentes, ciber, producto, gobernanza`.

## Cambiar la app

1. Edita `index.html`.
2. Desde Claude Code, publícalo de nuevo en la misma URL (Artifact → publish con `url` = la de arriba). Así se conservan los datos y las capacidades.
3. Para corregir el radar a mano, usa `ArtifactData` (update con `if_version`) sobre `radar/{id}`. No hace falta tocar el código.

Ideas pendientes de probar con el uso: ajustar la duración real de cada paso, añadir dictado para el paso «Enseñar» y exportar las explicaciones como borrador de post.
