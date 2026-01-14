### 1. Enunciado del Proyecto: Sistema Web de Gestión ADDAG

#### Objetivo General
Desarrollar una aplicación web *responsive* para la Asociación Departamental de Ajedrez de Guatemala (ADDAG) que permita la recepción de solicitudes de carnés, gestión administrativa de los mismos, generación de PDFs para impresión y, en una segunda fase, el control de matrícula y pagos de alumnos.

#### Arquitectura del Sistema (Stack Gratuito)
*   **Frontend & Backend (Serverless):** Next.js (React) + Tailwind CSS (Diseño).
*   **Base de Datos & Auth:** Supabase (PostgreSQL).
*   **Almacenamiento de Fotos:** Supabase Storage.
*   **Despliegue:** Vercel.
*   **Control de Versiones:** GitHub (GitFlow).

#### Alcance Fase 1: Gestión de Carnés
1.  **Módulo Público (Formulario):**
    *   Campos: Nombres, Apellidos, DPI/CUI (Validación única), Fecha Nacimiento, Teléfono, Departamento, Rol (Atleta/Deportista - calculado), Foto (Subida y validación de formato).
2.  **Módulo Administrativo (Login requerido):**
    *   Dashboard de solicitudes (Pendientes, Aprobadas, Impresas).
    *   Edición de datos y recorte/ajuste de fotografía (si es necesario).
    *   Generación de ID único (lógica autoincremental basada en el año: `F.001/25`).
    *   Generación de PDF: Frontal (Datos + Foto) y Trasera (Imagen estática redimensionada a tarjeta de crédito estándar).

---

### 2. Plan de Desarrollo e Implementación (Roadmap)

Sigue estos pasos con Copilot para mantener el orden.

#### Etapa 0: Configuración del Entorno y Repositorio
1.  **Crear Repositorio en GitHub:**
    *   Nombre: `addag-system-web`.
    *   Ramas iniciales: `main` (producción) y `develop` (desarrollo).
2.  **Configurar Proyecto Local:**
    *   Inicializar proyecto Next.js: `npx create-next-app@latest`.
    *   Instalar dependencias clave: `lucide-react` (iconos), `@supabase/supabase-js`, `jspdf` o `@react-pdf/renderer` (para el PDF).
3.  **Configurar GitFlow:**
    *   Utiliza la convención: Trabaja en ramas `feature/formulario-solicitud`, `feature/admin-login`, etc., y haz *Merge Request* (PR) hacia `develop`.

#### Etapa 1: Base de Datos (Supabase)
Pide a Copilot o ejecuta manualmente en Supabase SQL Editor:

```sql
-- Tabla para consolidar la Fase 1 y preparar la Fase 2
CREATE TABLE solicitantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dpi_cui VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    departamento VARCHAR(50) DEFAULT 'Guatemala',
    fecha_nacimiento DATE,
    foto_url TEXT,
    rol VARCHAR(20), -- 'ATLETA' o 'DEPORTISTA'
    estado_carnet VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADO, IMPRESO
    numero_carnet VARCHAR(20), -- Se genera al aprobar (Ej: F.001/25)
    anio_carnet INT -- Para reiniciar contadores anuales
);

-- Tabla de Usuarios Administradores (usaremos Supabase Auth, pero esto es para roles extra si hiciera falta)
-- En principio, usa la tabla 'auth.users' de Supabase.
```
*Configura las "Policies" (RLS) en Supabase:* El público puede hacer `INSERT` en `solicitantes`, pero solo los autenticados pueden `SELECT`, `UPDATE` o `DELETE`.

#### Etapa 2: Desarrollo del Frontend (Público)
1.  **Landing Page:** Una página simple con el botón "Solicitar Carné".
2.  **Formulario de Solicitud:**
    *   Validación de inputs.
    *   Subida de imagen a Supabase Storage (Bucket `fotos-carnet`).
    *   Al guardar, inserta en la tabla `solicitantes`.

#### Etapa 3: Desarrollo del Frontend (Administrativo)
1.  **Login:** Página `/admin` conectada a Supabase Auth.
2.  **Dashboard:** Tabla (Data Grid) que muestra los solicitantes.
3.  **Lógica de Aprobación:**
    *   Al dar clic en "Aprobar", el sistema debe buscar el último `numero_carnet` del año actual, sumarle 1 y asignarlo al registro.

#### Etapa 4: Generación de PDF (El núcleo del proyecto anterior)
Aquí sustituiremos `reportlab` de Python por **`@react-pdf/renderer`**.
1.  Crear un componente React que visualmente sea el carné (Frontal).
2.  Usar las medidas exactas (85.60 mm × 53.98 mm - Tarjeta CR-80).
3.  Incluir la lógica para generar el PDF con:
    *   Página 1: Mosaico de caras frontales (para imprimir en hoja).
    *   Página 2: Mosaico de caras traseras (imágenes estáticas).
4.  Botón en el Admin Panel: "Exportar Lote a PDF".

#### Etapa 5: Configuración de Vercel y Despliegue (CI/CD)
1.  Conecta tu cuenta de GitHub a Vercel.
2.  Importa el repositorio `addag-system-web`.
3.  **Configuración de Ramas:**
    *   **Production Branch:** `main`. (Solo se despliega cuando haces merge de `develop` a `main` y estás seguro).
    *   **Preview Branch:** `develop`. (Cada vez que subes a develop, Vercel crea una URL temporal para que pruebes).
4.  **Ignorar Builds innecesarias:** En Vercel, configuraciones de Git, puedes poner un comando para que ignore commits que solo sean documentación, por ejemplo.
5.  **Variables de Entorno:** Agrega las claves de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en el panel de Vercel.

---

### 3. Preparación para Fase 2 (Entrenadores y Pagos)
Al usar el esquema de base de datos propuesto, ya tenemos la tabla `solicitantes`. En la Fase 2:
1.  Crearemos tablas `entrenadores`, `cursos`, `pagos`.
2.  Vincularemos `pagos` con `solicitantes` (que pasarán a ser `alumnos` oficiales).
3.  El formulario de "Reporte de Pago" simplemente buscará el DPI del alumno en la tabla existente y registrará el pago.