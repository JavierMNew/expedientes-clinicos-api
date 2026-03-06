-- =============================================
-- Base de Datos: Sistema de Expedientes Clínicos
-- Seguridad en el Desarrollo de Aplicaciones
-- =============================================

-- Tabla de usuarios del sistema (doctores, admin, enfermeros)
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  role TEXT DEFAULT 'doctor' CHECK(role IN ('doctor', 'admin', 'enfermero'))
);

-- Tabla de expedientes clínicos (datos del paciente)
CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_paciente TEXT NOT NULL,
  fecha_nacimiento TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK(sexo IN ('M', 'F')),
  tipo_sangre TEXT NOT NULL CHECK(tipo_sangre IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  alergias TEXT DEFAULT 'Ninguna',
  antecedentes TEXT DEFAULT 'Ninguno',
  creado_por INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- Tabla de consultas médicas
CREATE TABLE IF NOT EXISTS consultas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expediente_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  diagnostico TEXT NOT NULL,
  tratamiento TEXT NOT NULL,
  notas TEXT DEFAULT '',
  fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id),
  FOREIGN KEY (doctor_id) REFERENCES usuarios(id)
);