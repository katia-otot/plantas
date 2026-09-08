# Anthos — Resumen de funciones

Documento para contexto en ChatGPT. App web de control del patio (plantas). Septiembre 2026.

---

## Para qué sirve

Anthos es una web para llevar el control del patio compartido: saber qué plantas hay que regar, fertilizar, podar o tratar; registrar lluvias; guardar fotos e historial; y consultar el patio desde el celular o la PC.

*Anthos* (griego ἄνθος) significa flor. Hay **un solo patio** compartido entre varias dueñas: todas ven los mismos datos (plantas, pájaros, notas, historial, fotos).

---

## Pantallas principales

| Pantalla | Qué hace |
|---|---|
| **Hoy** | Agenda del día: tareas vencidas o pendientes, botón para registrar lluvia, y un vistazo a los próximos cuidados. |
| **Mapa** | Cada jardín carga su propio plano (imagen); sin plano no hay fondo. Las plantas se ubican encima y se ve el estado de cuidados. |
| **Plantas** | Listado completo, alta de plantas nuevas y acceso a cada ficha. |
| **Menú** | Consultas, estación, notificaciones, ubicación del jardín, respaldo de datos e inicio/cierre de sesión. |

---

## Cuidados que controla

- **Riego** — intervalos distintos para verano e invierno; se ajusta según estación (o un override manual).
- **Lluvia** — se registra desde Hoy; puede postergar riegos de plantas de exterior según intensidad. Hay historial editable y explicación de cómo se cuentan.
- **Fertilizante** — recordatorios según lo programado en cada planta.
- **Poda** — seguimiento de cuándo podar.
- **Tratamientos** — anti-bichos / anti-hongos u otros cuidados periódicos.

En la ficha de cada planta: acciones rápidas (Regué, Fertilicé, Podé, Tratamiento), foto de portada, observaciones, próximo vencimiento de cada cuidado e historial con fotos.

---

## Ficha de planta — datos útiles

- Nombre, estado (alta / baja / posible), interior o exterior.
- Intervalos de riego por estación, fertilizante, poda y tratamientos.
- Resistencia a heladas y pH del suelo.
- Ubicación en el mapa del patio.
- Notas / observaciones e historial de eventos.

---

## Consultas y extras

| Sección | Qué hace |
|---|---|
| **Historial de lluvias** | Días de lluvia, intensidad, correcciones y marcar “No cuenta”. |
| **Historial general** | Eventos de cuidados del patio a lo largo del tiempo. |
| **Notas del patio** | Anotaciones sueltas del jardín, aparte de la ficha de cada planta. |
| **Pájaros** | Registro de aves que aparecen por el patio (con ficha propia). |
| **Por estado** | Filtrar plantas en alta, baja o posible. |
| **Por riego** | Ver plantas agrupadas por intervalo de riego. |
| **Heladas** | Consulta de resistencia al frío. |
| **pH del suelo** | Consulta según el pH indicado en cada planta. |

---

## Configuración y datos

- **Estación** — verano/invierno según calendario, con posibilidad de forzar la estación.
- **Ubicación del jardín** — datos de ubicación del patio.
- **Notificaciones push** — avisos en el celular (Firebase).
- **Importar planilla** — carga inicial desde Excel o CSV.
- **Respaldo** — descargar o restaurar JSON completo (plantas, historial, lluvias y fotos).
- **Acceso** — login con Google (Firebase); patio compartido entre cuentas dueñas.

---

## En una frase

Anthos reemplaza la memoria y las anotaciones sueltas: te dice **qué hay que hacer hoy** en el patio, guarda **qué se hizo** (con fotos) y adapta el riego cuando **llueve**.

---

## Stack técnico (contexto)

- Next.js + Prisma + SQLite
- Fotos en disco (`data/uploads/`)
- Auth con Google vía Firebase + sesión Auth.js
- Notificaciones FCM
- UI en español
