-- 1. Crear un ENUM para los estados (para mantener orden)
CREATE TYPE estado_solicitud AS ENUM ('PENDIENTE', 'APROBADO', 'IMPRESO', 'RECHAZADO');
CREATE TYPE rol_atleta AS ENUM ('ATLETA', 'DEPORTISTA');

-- 2. Crear la tabla principal (Unificada)
CREATE TABLE miembros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos Personales
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    dpi_cui VARCHAR(20) NOT NULL UNIQUE, -- Validar que sea único
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(20),
    departamento VARCHAR(50) DEFAULT 'Guatemala',
    foto_url TEXT, -- URL de la imagen en Supabase Storage
    
    -- Datos Administrativos
    rol rol_atleta DEFAULT 'DEPORTISTA',
    estado estado_solicitud DEFAULT 'PENDIENTE',
    
    -- Datos del Carné (Se llenan al aprobar)
    carnet_numero VARCHAR(20) UNIQUE, -- El código F.0001/25
    carnet_correlativo INT, -- El número entero (1, 2, 3...) para facilitar conteos
    carnet_anio INT -- El año del carné (2025)
);

-- 3. Habilitar seguridad (Row Level Security)
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede crear (INSERT) una solicitud
CREATE POLICY "Permitir inserción pública" ON miembros FOR INSERT WITH CHECK (true);

-- Política: Solo lectura pública (opcional, o restringir solo a admin)
-- Por ahora dejaremos que sea público para lectura para facilitar tu desarrollo,
-- luego lo cerraremos solo a admins.
CREATE POLICY "Lectura pública" ON miembros FOR SELECT USING (true);

-- Política: Actualización solo para admins (simulado por ahora público para dev)
CREATE POLICY "Actualización pública" ON miembros FOR UPDATE USING (true);