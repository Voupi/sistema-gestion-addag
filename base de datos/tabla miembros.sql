-- 1. Crear ENUMS
CREATE TYPE estado_solicitud AS ENUM ('PENDIENTE', 'APROBADO', 'IMPRESO', 'RECHAZADO');
CREATE TYPE rol_atleta AS ENUM ('ATLETA', 'DEPORTISTA');
CREATE TYPE tipo_doc_identidad AS ENUM ('DPI', 'PASAPORTE'); -- <--- NUEVO

-- 2. Crear la tabla principal (Unificada)
CREATE TABLE miembros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos Personales
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    tipo_documento tipo_doc_identidad DEFAULT 'DPI', -- <--- NUEVO
    dpi_cui VARCHAR(20) NOT NULL UNIQUE, -- Sirve para DPI o Pasaporte
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(20),
    departamento VARCHAR(50) DEFAULT 'Guatemala',
    foto_url TEXT,
    
    -- Datos Administrativos
    rol rol_atleta DEFAULT 'DEPORTISTA',
    estado estado_solicitud DEFAULT 'PENDIENTE',
    
    -- Datos del Carné
    carnet_numero VARCHAR(20) UNIQUE,
    carnet_correlativo INT,
    carnet_anio INT
);

-- 3. Habilitar seguridad (Row Level Security)
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir inserción pública" ON miembros FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura pública" ON miembros FOR SELECT USING (true);
CREATE POLICY "Actualización pública" ON miembros FOR UPDATE USING (true);


-- Agregar columna email
ALTER TABLE miembros 
ADD COLUMN email TEXT;

-- (Opcional) Si quieres asegurar que no se repitan correos, descomenta la siguiente línea:
-- ALTER TABLE miembros ADD CONSTRAINT unique_email UNIQUE (email);