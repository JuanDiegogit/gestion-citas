# API Gestión de Citas – Clínica Dental

Versión: 1.0  
Base URL (desarrollo): `http://localhost:3000`

Esta API gestiona el ciclo de vida de las citas de la clínica dental y se integra con:
- **Sistema de Caja** (para notificación de pago de anticipos)
- **Sistema de Clínica** (para consumo de las citas en el front y en el flujo de atención)

---

## 1. Convenciones generales

- Todas las peticiones y respuestas usan **JSON**.
- Fechas en formato **ISO 8601**, por ejemplo: `2025-11-20T10:30:00`.
- Codificación: **UTF-8**.
- Por ahora **no hay autenticación** (entorno académico/desarrollo).

### 1.1 Estados de cita

Campo: `estado_cita` (tabla `Cita`)

- `PROGRAMADA` → recién creada.
- `CONFIRMADA` → anticipo pagado (si aplica) y cita lista para atención.
- `ATENDIDA` → el paciente ya fue atendido.

### 1.2 Estados de anticipo

Campo: `estado` (tabla `AnticipoCita`)

- `PENDIENTE` → anticipo registrado pero sin pago confirmado por Caja.
- `PAGADO` → anticipo confirmado, con `id_pago_caja` y `fecha_confirmacion`.

---

## 2. Endpoints de Citas

### 2.1 Crear cita  
**POST** `/citas`

Crea una nueva cita para un paciente y, opcionalmente, un registro de anticipo.

- Genera automáticamente el `folio_cita` con el patrón:  
  `CITA-YYYYMMDD-HHMMSS`
- Inicializa la cita con `estado_cita = "PROGRAMADA"`.
- Si se indica anticipo, se crea un registro en `AnticipoCita` con `estado = "PENDIENTE"`.

#### Body (JSON)

json
{
  "id_paciente": 1,
  "id_medico": 1,
  "id_tratamiento": 1,
  "fecha_cita": "2025-11-20T10:30:00",
  "medio_solicitud": "PRESENCIAL",
  "motivo_cita": "Limpieza dental",
  "info_relevante": "Alergia a penicilina",
  "observaciones": "Prefiere turno matutino",
  "responsable_registro": "Recepción",
  "requiere_anticipo": true,
  "monto_anticipo": 500
}

##### Notas de validación

- id_paciente, id_medico, id_tratamiento, fecha_cita son requeridos.

- Si requiere_anticipo = true → monto_anticipo es obligatorio.

- medio_solicitud puede ser valores como: PRESENCIAL, WHATSAPP, LLAMADA, etc.


###### Respuesta 201 – Created

{
  "message": "Cita creada correctamente",
  "cita": {
    "id_cita": 1,
    "folio_cita": "CITA-20251119-021433"
  },
  "anticipo": {
    "id_anticipo": 1
  }
}

####### Errores

400 – Datos inválidos o faltantes.

500 – Error interno de servidor.

2.2 Notificar pago de anticipo

POST /pagos/notificacion

Usado por el sistema de Caja para confirmar que el anticipo fue pagado.

Lógica de negocio (resumen):

Se busca el anticipo más reciente en estado PENDIENTE para ese id_paciente.

Se actualiza a:

estado = "PAGADO"

id_pago_caja = <id_pago recibido>

fecha_confirmacion = GETDATE()

Si la cita asociada estaba PROGRAMADA, pasa a CONFIRMADA.

{
  "id_paciente": 1,
  "id_pago": "PAGO-TEST-001"
}

Respuesta 200 – OK
{
  "message": "Pago de anticipo registrado correctamente",
  "anticipo": {
    "id_anticipo": 1,
    "id_cita": 1,
    "id_paciente": 1
  }
}

Errores

404 – No se encontró anticipo pendiente para ese paciente.

409 – El anticipo ya estaba marcado como PAGADO.

500 – Error interno.

2.3 Validar cita para iniciar atención

POST /citas/:id/iniciar-atencion

Verifica que la cita esté lista para iniciar atención en clínica:

La cita existe.

estado_cita es CONFIRMADA.

Si tenía anticipo, éste está PAGADO.

Este endpoint no cambia el estado de la cita; sólo valida y responde.

Path params

id – id numérico de la cita.

Respuesta 200 – OK
{
  "message": "Cita lista para iniciar atención en clínica",
  "cita": {
    "id_cita": 1,
    "folio_cita": "CITA-20251119-021433",
    "estado_cita": "CONFIRMADA"
  }
}
Errores

400 – id no numérico.

404 – Cita no encontrada.

409 – La cita no está confirmada o el anticipo sigue pendiente.

500 – Error interno.

2.4 Marcar cita como atendida

POST /citas/:id/atendida

Marca la cita como ATENDIDA cuando el procedimiento ya se realizó.

Path params

id – id numérico de la cita.

Lógica de negocio

Verifica que la cita exista.

Opcionalmente puede validar que el estado actual sea CONFIRMADA.

Actualiza estado_cita = "ATENDIDA".

Respuesta 200 – OK
{
  "message": "Cita marcada como ATENDIDA correctamente",
  "cita": {
    "id_cita": 1,
    "folio_cita": "CITA-20251119-021433",
    "estado_cita": "ATENDIDA",
    "fecha_cita": "2025-11-20T17:30:00.000Z"
  }
}

Errores

400 – id no numérico.

404 – Cita no encontrada.

409 – Estado de cita no válido para marcar como atendida (si se valida).

500 – Error interno.

2.5 Listar citas (detalle completo)

GET /citas

Devuelve un listado de citas con información detallada, incluyendo paciente, médico, tratamiento y estado de pago.

Parámetros de query (opcionales)

estado_cita – filtra por estado (PROGRAMADA, CONFIRMADA, ATENDIDA).

id_medico – filtra por médico.

id_paciente – filtra por paciente.

fecha_desde – cita a partir de esa fecha/hora.

fecha_hasta – cita hasta esa fecha/hora.

page – número de página (default: 1).

pageSize – tamaño de página (default: 20).

Ejemplos:

GET /citas

GET /citas?estado_cita=ATENDIDA

GET /citas?id_medico=1&estado_cita=CONFIRMADA

GET /citas?fecha_desde=2025-11-20T00:00:00&fecha_hasta=2025-11-21T00:00:00

Respuesta 200 – OK

{
  "total": 1,
  "citas": [
    {
      "id_cita": 1,
      "folio_cita": "CITA-20251119-021433",
      "fecha_registro": "2025-11-19T02:14:33.624Z",
      "fecha_cita": "2025-11-20T17:30:00.000Z",
      "estado_cita": "ATENDIDA",
      "medio_solicitud": "PRESENCIAL",
      "motivo_cita": "Limpieza dental",
      "info_relevante": "Alergia a penicilina",
      "observaciones": "Prefiere turno matutino",
      "responsable_registro": "Recepción",
      "saldo_paciente": null,
      "monto_cobro": 500,
      "estado_pago": "PAGADO",
      "id_paciente": 1,
      "nombre_paciente": "Paciente",
      "apellidos_paciente": "Prueba",
      "id_medico": 1,
      "nombre_medico": "Médico",
      "apellidos_medico": "Prueba",
      "id_tratamiento": 1,
      "nombre_tratamiento": "Limpieza dental"
    }
  ]
}

2.6 Obtener detalle de una cita

GET /citas/:id

Devuelve la información completa de una cita específica.

Path params

id – id numérico de la cita.

Respuesta 200 – OK

Estructura similar a un elemento de /citas, por ejemplo:

{
  "cita": {
    "id_cita": 1,
    "folio_cita": "CITA-20251119-021433",
    "fecha_registro": "2025-11-19T02:14:33.624Z",
    "fecha_cita": "2025-11-20T17:30:00.000Z",
    "estado_cita": "ATENDIDA",
    "medio_solicitud": "PRESENCIAL",
    "motivo_cita": "Limpieza dental",
    "info_relevante": "Alergia a penicilina",
    "observaciones": "Prefiere turno matutino",
    "responsable_registro": "Recepción",
    "monto_cobro": 500,
    "estado_pago": "PAGADO",
    "id_paciente": 1,
    "nombre_paciente": "Paciente",
    "apellidos_paciente": "Prueba",
    "id_medico": 1,
    "nombre_medico": "Médico",
    "apellidos_medico": "Prueba",
    "id_tratamiento": 1,
    "nombre_tratamiento": "Limpieza dental"
  }
}

Errores

400 – id no numérico.

404 – Cita no encontrada.

2.7 Listar citas (versión ligera para listas rápidas)

GET /citas/resumen

Endpoint pensado para listas rápidas en el front (agenda del día, listado compactado, etc.).

Devuelve menos columnas y soporta filtros y paginación.

Parámetros de query (opcionales)

estado_cita

id_medico

fecha_desde

fecha_hasta

page (default: 1)

pageSize (default: 20)

Ejemplos:

GET /citas/resumen

GET /citas/resumen?estado_cita=ATENDIDA

GET /citas/resumen?id_medico=1

GET /citas/resumen?fecha_desde=2025-11-20T00:00:00&fecha_hasta=2025-11-21T00:00:00

Respuesta 200 – OK

{
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "citas": [
    {
      "id_cita": 1,
      "folio_cita": "CITA-20251119-021433",
      "fecha_cita": "2025-11-20T17:30:00.000Z",
      "estado_cita": "ATENDIDA",
      "estado_pago": "PAGADO",
      "nombre_paciente": "Paciente",
      "nombre_medico": "Médico",
      "nombre_tratamiento": "Limpieza dental"
    }
  ]
}

3. Códigos de respuesta comunes

200 OK – Operación exitosa.

201 Created – Recurso creado (p. ej. cita nueva).

400 Bad Request – Error de validación / parámetros incorrectos.

404 Not Found – Recurso no encontrado.

409 Conflict – Estado de negocio inválido (p. ej. anticipo ya pagado, cita en estado incorrecto).

500 Internal Server Error – Error no controlado en el servidor.

4. Notas para futura integración

Cuando se agregue autenticación, se recomienda un esquema tipo JWT con un header Authorization: Bearer <token>.

Esta API puede exponerse detrás de un gateway y consumirla desde:

Front de recepción (listados y creación de citas).

Sistema de Caja (sólo POST /pagos/notificacion).

Módulo de atención clínica (uso de /citas/:id, /citas/:id/iniciar-atencion y /citas/:id/atendida).
