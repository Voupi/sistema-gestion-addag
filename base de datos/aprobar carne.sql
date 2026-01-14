CREATE OR REPLACE FUNCTION aprobar_miembro(miembro_id UUID)
RETURNS VOID AS $$
DECLARE
    anio_actual INT;
    nuevo_correlativo INT;
    nuevo_codigo TEXT;
    anio_corto TEXT;
BEGIN
    -- 1. Obtener el año actual
    anio_actual := EXTRACT(YEAR FROM NOW());
    
    -- 2. Obtener el último correlativo de este año y sumarle 1
    -- Si no hay ninguno, empieza en 1.
    SELECT COALESCE(MAX(carnet_correlativo), 0) + 1
    INTO nuevo_correlativo
    FROM miembros
    WHERE carnet_anio = anio_actual;

    -- 3. Formatear el código (Tu lógica de Python traducida)
    -- lpad(..., 4, '0') hace lo mismo que "F.000" + id
    -- Ejemplo: si es 1 -> '0001', si es 10 -> '0010', si es 100 -> '0100'
    anio_corto := SUBSTRING(CAST(anio_actual AS TEXT) FROM 3 FOR 2); -- '2025' -> '25'
    
    nuevo_codigo := 'F.' || LPAD(CAST(nuevo_correlativo AS TEXT), 4, '0') || '/' || anio_corto;

    -- 4. Actualizar el registro
    UPDATE miembros
    SET 
        estado = 'APROBADO',
        carnet_correlativo = nuevo_correlativo,
        carnet_anio = anio_actual,
        carnet_numero = nuevo_codigo,
        updated_at = NOW()
    WHERE id = miembro_id;
END;
$$ LANGUAGE plpgsql;