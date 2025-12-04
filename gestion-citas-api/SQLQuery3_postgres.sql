-- ===========================================
--   BASE DE DATOS: GESTIÓN DE CITA (PostgreSQL)
-- ===========================================

-- TABLA: Medicos
CREATE TABLE medicos (
    id_medico SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    telefono VARCHAR(20),
    especialidad VARCHAR(80),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- TABLA: Pacientes
CREATE TABLE pacientes (
    id_paciente SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- TABLA: Tratamientos
CREATE TABLE tratamientos (
    id_tratamiento SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(300),
    costo NUMERIC(10,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- TABLA: Citas
CREATE TABLE citas (
    id_cita SERIAL PRIMARY KEY,
    id_paciente INT NOT NULL REFERENCES pacientes(id_paciente),
    id_medico INT NOT NULL REFERENCES medicos(id_medico),
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    motivo VARCHAR(300),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
);

-- TABLA: Citas_Tratamientos (relaci�n N:N)
CREATE TABLE cita_tratamientos (
    id SERIAL PRIMARY KEY,
    id_cita INT NOT NULL REFERENCES citas(id_cita) ON DELETE CASCADE,
    id_tratamiento INT NOT NULL REFERENCES tratamientos(id_tratamiento),
    cantidad INT NOT NULL DEFAULT 1
);

-- TABLA: Pagos
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_cita INT NOT NULL REFERENCES citas(id_cita),
    monto NUMERIC(10,2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT NOW(),
    metodo VARCHAR(30) NOT NULL,
    referencia VARCHAR(100)
);

-- INDICES
CREATE INDEX idx_citas_paciente ON citas(id_paciente);
CREATE INDEX idx_citas_medico ON citas(id_medico);
CREATE INDEX idx_pagos_cita ON pagos(id_cita);
--fin de la base de datos