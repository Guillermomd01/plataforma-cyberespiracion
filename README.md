# Plataforma de cursos de Cyberespiración

Sustituye a WordPress + LearnDash en `plataforma.cyberespiracion.com`.

## Piezas

| Pieza | Servicio |
| --- | --- |
| Web y lógica | Next.js 15 en Netlify |
| Base de datos | Postgres en Neon (proyecto `cyberespiracion`, Frankfurt) |
| Cuentas | Better Auth (email y contraseña, tablas en la propia base de datos) |
| Audios y PDF | Bunny Storage + Pull Zone con Token Authentication |
| Vídeos | YouTube, mostrado con youtube-nocookie.com |
| Emails | Brevo, API transaccional, desde hola@cyberespiracion.com |

## Variables de entorno

Ver `.env.example`. En Netlify van en *Site configuration → Environment variables*.

## Estructura del contenido

Curso → módulos → lecciones. Cada lección tiene un vídeo de YouTube opcional,
texto opcional y archivos (audios y PDF) en `lesson_assets`.
En la migración, las «lecciones» de LearnDash pasaron a ser módulos y los
«temas», lecciones. Renacimiento Celular no tenía temas: tiene un único módulo.

## Rutas

- `/entrar`, `/recuperar`, `/nueva-contrasena` (también sirve para activar cuentas migradas)
- `/cursos`, `/cursos/[curso]`, `/cursos/[curso]/[leccion]`
- `/cuenta`
- `/panel` (solo `role = 'admin'`): alumnos, accesos, emails de activación

## Cambios en la base de datos

El esquema está en `src/db/schema.ts`. Para un cambio:
`npx drizzle-kit generate --name <cambio>` y aplicar el SQL de `drizzle/`.

## Migración desde WordPress (oct 2026)

`scripts/migracion/build_import.py` generó el SQL de importación a partir del
backup de UpdraftPlus y de la exportación JSON de LearnDash. Se ejecutó una vez;
se guarda solo como referencia. No contiene datos personales.
