-- 1. Crear tabla de entrenadores
CREATE TABLE entrenadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar seguridad (RLS) para entrenadores
ALTER TABLE entrenadores ENABLE ROW LEVEL SECURITY;

-- Política: El formulario público necesita poder LEER los nombres
CREATE POLICY "Lectura publica de entrenadores" 
ON entrenadores FOR SELECT USING (activo = true);

-- Política: Los admins pueden modificar
CREATE POLICY "Admins gestionan entrenadores" 
ON entrenadores FOR ALL USING (auth.role() = 'authenticated');

-- 2. Modificar la tabla miembros (Atletas)
ALTER TABLE miembros 
ADD COLUMN entrenador_id UUID REFERENCES entrenadores(id),
ADD COLUMN aprobado_por TEXT,
ADD COLUMN fecha_aprobacion TIMESTAMP WITH TIME ZONE,
ADD COLUMN fecha_expiracion DATE;

-- 3. INSERTAR TUS CUENTAS INICIALES (¡Cámbialas por tus datos reales!)
-- Pon tu nombre y el correo con el que entrarás al sistema. El "TRUE" indica que eres ADMIN.
INSERT INTO entrenadores (nombre_completo, email, es_admin) VALUES
('Administración Central', 'tesoreria@ajedrezguate.org', TRUE),
('Tu Nombre (Entrenador Jefe)', 'tu_correo_real@gmail.com', TRUE);
-- Después podrás agregar a los demás profes directo en la tabla con FALSE.

ALTER TABLE solicitudes_rechazadas ADD COLUMN entrenador_id UUID;