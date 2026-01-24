-- 1. Crear tabla de Parqueos (Espejo simplificado de miembros)
CREATE TABLE parqueos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos Personales
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    tipo_documento tipo_doc_identidad DEFAULT 'DPI',
    dpi_cui VARCHAR(20) NOT NULL UNIQUE, 
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(20),
    departamento VARCHAR(50) DEFAULT 'Guatemala',
    email TEXT,
    foto_url TEXT,
    foto_url_final TEXT,
    
    -- Datos Administrativos
    estado estado_solicitud DEFAULT 'PENDIENTE',
    
    -- Datos del Carné (P.0001/26)
    carnet_numero VARCHAR(20) UNIQUE,
    carnet_correlativo INT,
    carnet_anio INT
);

-- 2. Habilitar seguridad RLS
ALTER TABLE parqueos ENABLE ROW LEVEL SECURITY;

-- Políticas (Iguales a miembros)
CREATE POLICY "Public Insert Parqueos" ON parqueos FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Select Parqueos" ON parqueos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin Update Parqueos" ON parqueos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin Delete Parqueos" ON parqueos FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Función para Aprobar Parqueo (Genera P.0001/26)
CREATE OR REPLACE FUNCTION aprobar_parqueo(parqueo_id UUID)
RETURNS VOID AS $$
DECLARE
    anio_actual INT;
    nuevo_correlativo INT;
    nuevo_codigo TEXT;
    anio_corto TEXT;
BEGIN
    anio_actual := EXTRACT(YEAR FROM NOW());
    
    -- Obtener último correlativo de parqueo
    SELECT COALESCE(MAX(carnet_correlativo), 0) + 1
    INTO nuevo_correlativo
    FROM parqueos
    WHERE carnet_anio = anio_actual;

    anio_corto := SUBSTRING(CAST(anio_actual AS TEXT) FROM 3 FOR 2);
    
    -- Formato P.0001/26
    nuevo_codigo := 'P.' || LPAD(CAST(nuevo_correlativo AS TEXT), 4, '0') || '/' || anio_corto;

    UPDATE parqueos
    SET 
        estado = 'APROBADO',
        carnet_correlativo = nuevo_correlativo,
        carnet_anio = anio_actual,
        carnet_numero = nuevo_codigo,
        updated_at = NOW()
    WHERE id = parqueo_id;
END;
$$ LANGUAGE plpgsql;