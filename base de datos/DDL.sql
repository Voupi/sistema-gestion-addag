-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.entrenadores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  email text NOT NULL UNIQUE,
  es_admin boolean DEFAULT false,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entrenadores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.miembros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nombres text NOT NULL,
  apellidos text NOT NULL,
  dpi_cui character varying NOT NULL UNIQUE,
  fecha_nacimiento date NOT NULL,
  telefono character varying,
  departamento character varying DEFAULT 'Guatemala'::character varying,
  foto_url text,
  rol USER-DEFINED DEFAULT 'ATLETA'::rol_atleta,
  estado USER-DEFINED DEFAULT 'PENDIENTE'::estado_solicitud,
  carnet_numero character varying UNIQUE,
  carnet_correlativo integer,
  carnet_anio integer,
  tipo_documento USER-DEFINED DEFAULT 'DPI'::tipo_doc_identidad,
  email text,
  foto_url_final text,
  entrenador_id uuid,
  aprobado_por text,
  fecha_aprobacion timestamp with time zone,
  fecha_expiracion date,
  CONSTRAINT miembros_pkey PRIMARY KEY (id),
  CONSTRAINT miembros_entrenador_id_fkey FOREIGN KEY (entrenador_id) REFERENCES public.entrenadores(id)
);
CREATE TABLE public.parqueos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nombres text NOT NULL,
  apellidos text NOT NULL,
  tipo_documento USER-DEFINED DEFAULT 'DPI'::tipo_doc_identidad,
  dpi_cui character varying NOT NULL UNIQUE,
  fecha_nacimiento date NOT NULL,
  telefono character varying,
  departamento character varying DEFAULT 'Guatemala'::character varying,
  email text,
  foto_url text,
  foto_url_final text,
  estado USER-DEFINED DEFAULT 'PENDIENTE'::estado_solicitud,
  carnet_numero character varying UNIQUE,
  carnet_correlativo integer,
  carnet_anio integer,
  CONSTRAINT parqueos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.solicitudes_rechazadas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  origen character varying NOT NULL,
  motivo text,
  nombres text,
  apellidos text,
  dpi_cui character varying,
  email text,
  telefono character varying,
  departamento character varying,
  foto_url text,
  fecha_solicitud_original timestamp with time zone,
  entrenador_id uuid,
  CONSTRAINT solicitudes_rechazadas_pkey PRIMARY KEY (id)
);