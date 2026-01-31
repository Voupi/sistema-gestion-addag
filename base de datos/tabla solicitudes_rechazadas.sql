-- 1. Crear la tabla de historial de rechazos
CREATE TABLE solicitudes_rechazadas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha del rechazo
    
    -- Datos de Origen
    origen VARCHAR(20) NOT NULL, -- 'MIEMBRO' o 'PARQUEO'
    motivo TEXT, -- Por qué se rechazó
    
    -- Copia de los datos del usuario (Snapshot)
    nombres TEXT,
    apellidos TEXT,
    dpi_cui VARCHAR(20), -- Sin UNIQUE, permite repetidos
    email TEXT,
    telefono VARCHAR(20),
    departamento VARCHAR(50),
    foto_url TEXT, -- Guardamos la URL por referencia (aunque el archivo se borre)
    fecha_solicitud_original TIMESTAMP WITH TIME ZONE -- Cuándo pidió el carné
);

-- 2. Habilitar seguridad (Solo Admin ve esto)
ALTER TABLE solicitudes_rechazadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access rechazados"
ON solicitudes_rechazadas
FOR ALL
USING ( auth.role() = 'authenticated' );