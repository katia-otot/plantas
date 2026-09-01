---
name: demostracion
description: >-
  Skill de demostración que enseña la estructura y patrones de Cursor Agent Skills.
  Use when the user asks for a skill demo, wants to learn how skills work, mentions
  "demostracion", or wants to validate skill output format.
disable-model-invocation: true
---

# Skill de demostración

Este skill muestra cómo estructurar instrucciones reutilizables para el agente. Al activarlo, seguí el flujo de abajo y entregá la respuesta con el formato indicado.

## Cuándo aplicarlo

- El usuario pide una demo de skills o quiere ver un ejemplo funcional.
- Hay que explicar qué es un skill y cómo se organiza.
- Hay que validar que un skill produce salida consistente.

## Flujo de trabajo

Copiá este checklist y marcá el progreso en la respuesta:

```
Progreso:
- [ ] Paso 1: Confirmar que leíste este skill
- [ ] Paso 2: Elegir el tipo de demo (ver abajo)
- [ ] Paso 3: Generar la salida con la plantilla
- [ ] Paso 4: Validar con el script (opcional)
```

### Paso 1: Confirmar lectura

Indicá brevemente que aplicaste el skill `demostracion` y desde qué archivo lo leíste.

### Paso 2: Elegir tipo de demo

| Si el usuario pide… | Seguí… |
|---------------------|--------|
| Explicación general | Sección "Demo educativa" |
| Algo del proyecto Plantas | Sección "Demo contextual" |
| Validar formato | Sección "Demo de validación" |

**Demo educativa** — Explicá en 3–5 bullets: qué es un skill, dónde vive, qué lleva el frontmatter y cuándo usar archivos extra.

**Demo contextual** — Relacioná el concepto con esta app (plantas, riego, jardines). Usá términos del repo: `PlantCard`, `lib/plants.ts`, rutas en `app/plants/`.

**Demo de validación** — Generá la salida con la plantilla y ejecutá:

```bash
node scripts/validate-demo.js "titulo de prueba"
```

Si el script imprime `OK`, incluí esa confirmación en la respuesta.

### Paso 3: Plantilla de salida

Usá siempre esta estructura:

```markdown
# Demo: [título breve]

## Resumen
[Un párrafo: qué demostraste y por qué importa]

## Qué hace este skill
- Punto 1
- Punto 2
- Punto 3

## Estructura del skill
| Archivo | Propósito |
|---------|-----------|
| SKILL.md | Instrucciones principales |
| examples.md | Ejemplos concretos |
| reference.md | Detalle opcional |
| scripts/ | Utilidades ejecutables |

## Próximo paso sugerido
[Una acción concreta para el usuario]
```

### Paso 4: Tono y idioma

- Respondé en español salvo que el usuario pida otro idioma.
- Sé conciso: el skill debe ahorrar tokens, no repetir documentación obvia de Cursor.

## Reglas de este skill

1. No modifiques código del proyecto salvo que el usuario lo pida explícitamente.
2. No crees skills en `~/.cursor/skills-cursor/` (reservado para Cursor).
3. Para skills del proyecto, usá `.cursor/skills/nombre-del-skill/`.
4. Para skills personales, usá `~/.cursor/skills/nombre-del-skill/`.

## Recursos adicionales

- Ejemplos de entrada/salida: [examples.md](examples.md)
- Referencia extendida de patrones: [reference.md](reference.md)
