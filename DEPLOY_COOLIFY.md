# 🚀 Guía de Despliegue en Coolify desde GitHub

Esta guía te explica paso a paso cómo subir **Hermes Launchpad** a GitHub y desplegarlo en **Coolify** con persistencia total en la base de datos SQLite y credenciales seguras.

---

## 1. Subir el código a GitHub

1. En tu máquina local o terminal, inicializa el repositorio si aún no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "feat: Hermes Launchpad listo para Coolify con SQLite y Docker"
   ```

2. Crea un repositorio en [GitHub](https://github.com/new) (puede ser público o privado).

3. Conecta tu repositorio local y sube los cambios:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Crear la Aplicación en Coolify

1. Abre tu panel de **Coolify**.
2. Ve a **Projects** -> selecciona tu proyecto y entorno.
3. Haz clic en **+ New Resource** -> **Application** -> **Public Repository** o **Private Repository (GitHub App)**.
4. Pega la URL de tu repositorio de GitHub: `https://github.com/TU_USUARIO/TU_REPOSITORIO`.
5. En **Branch**, selecciona `main`.
6. En **Build Pack**, selecciona **Dockerfile** (Coolify detectará automáticamente el archivo `Dockerfile` en la raíz).

---

## 3. Configurar el Volumen Persistente para SQLite (¡Muy Importante!)

Para que tus programas guardados en SQLite no se borren cuando Coolify actualice o reinicie el contenedor:

1. Dentro de tu aplicación en Coolify, ve a la pestaña **Storages** (o **Persistent Storage**).
2. Haz clic en **+ Add Persistent Storage**.
3. Configura:
   - **Name**: `hermes-sqlite-data`
   - **Destination Path**: `/app/data`
4. Guarda los cambios (**Save**).

*(Con esto, `/app/data/dashboard.sqlite` quedará almacenado de forma permanente en el disco de tu servidor).*

---

## 4. Configurar Variables de Entorno en Coolify

En la pestaña **Environment Variables** de tu aplicación en Coolify, agrega las siguientes variables:

| Variable | Valor Recomendado | Descripción |
| :--- | :--- | :--- |
| `ADMIN_USERNAME` | `tu_usuario` | Tu nombre de usuario para iniciar sesión. |
| `ADMIN_PASSWORD` | `TuClaveSegura123!` | Tu contraseña privada para acceder al dashboard. |
| `ALLOW_DEMO` | `false` | Ponlo en `false` para desactivar el acceso demo libre en producción. |
| `SEED_DEMO_DATA` | `false` | Ponlo en `false` para que la base de datos inicie 100% vacía y limpia para tus propias URLs. |
| `DATA_DIR` | `/app/data` | Carpeta montada en el volumen persistente. |
| `DATABASE_PATH` | `/app/data/dashboard.sqlite` | Archivo de base de datos SQLite. |
| `PORT` | `3000` | Puerto interno del contenedor. |
| `GEMINI_API_KEY` | *(Opcional)* Tu API Key de Google AI | Para que el agente IA Hermes responda con inteligencia generativa. |
| `ADDITIONAL_USERS` | *(Opcional)* `dev:clave1,operaciones:clave2` | Si deseas dar acceso a más personas. |

---

## 5. Puerto y Dominio

1. En la configuración general de Coolify:
   - **Port**: `3000`
   - **Domains**: Tu dominio o subdominio (ej: `https://launchpad.tudominio.com`).
2. Coolify generará automáticamente el certificado SSL (HTTPS) gratuito mediante Traefik y Let's Encrypt.

---

## 6. Desplegar (Deploy)

1. Haz clic en el botón **Deploy** en la esquina superior derecha de Coolify.
2. Coolify clonará el repositorio, ejecutará el `Dockerfile` de múltiples etapas, compilará el frontend React y levantará el servidor Node.js en el puerto 3000.
3. ¡Listo! Abre tu dominio e inicia sesión con el usuario y contraseña que definiste en las variables de entorno.
