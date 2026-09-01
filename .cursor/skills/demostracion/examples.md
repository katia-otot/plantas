# Ejemplos — skill demostracion

## Ejemplo 1: Demo educativa

**Entrada del usuario:**
> haceme un skill de demostracion

**Salida esperada (extracto):**

```markdown
# Demo: Cómo funcionan los Agent Skills

## Resumen
Un skill es un archivo SKILL.md con instrucciones que el agente lee cuando la tarea lo requiere...

## Qué hace este skill
- Enseña la estructura estándar (frontmatter + cuerpo)
- Define una plantilla de respuesta reproducible
- Incluye un script de validación opcional
```

## Ejemplo 2: Demo contextual (Plantas)

**Entrada del usuario:**
> mostrame la demo pero aplicada a este proyecto

**Salida esperada (extracto):**

```markdown
# Demo: Skills para el jardín digital

## Resumen
Un skill de proyecto podría estandarizar cómo agregar endpoints de riego o revisar `lib/care-schedule.ts`...

## Próximo paso sugerido
Crear un skill `riego-consulta` en `.cursor/skills/riego-consulta/` con checklist para cambios en `app/consulta/riego/`.
```

## Ejemplo 3: Validación con script

**Comando:**
```bash
node scripts/validate-demo.js "Mi título"
```

**Salida del script:**
```
OK: título válido ("Mi título")
```
