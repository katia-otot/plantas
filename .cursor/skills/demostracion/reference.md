# Referencia — patrones de skills

## Frontmatter mínimo

```yaml
---
name: mi-skill
description: Qué hace y cuándo usarlo. Incluir palabras clave de disparo.
disable-model-invocation: true
---
```

Omití `disable-model-invocation` solo si querés que el agente lo cargue automáticamente por contexto.

## Patrones útiles

| Patrón | Uso |
|--------|-----|
| Template | Formato fijo de respuesta (informes, reviews) |
| Workflow | Pasos numerados + checklist |
| Conditional | Ramas según tipo de tarea |
| Feedback loop | Validar → corregir → revalidar |
| Progressive disclosure | Detalle en `reference.md`, no en SKILL.md |

## Anti-patrones

- Descripciones vagas ("ayuda con cosas")
- Skills de más de 500 líneas en SKILL.md
- Rutas Windows con `\` en instrucciones
- Demasiadas opciones sin default claro
- Información que caduca (fechas, versiones sin contexto)

## Ubicaciones

| Tipo | Ruta |
|------|------|
| Proyecto | `.cursor/skills/<nombre>/` |
| Personal | `~/.cursor/skills/<nombre>/` |
| Reservado (no tocar) | `~/.cursor/skills-cursor/` |
