// src/pages/CitaDetalle.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchCitaDetalle,
  registrarPagoParcial,
  registrarPagoAnticipoEnCaja,
  obtenerSaldoPacienteCaja,
} from '../api/citasApi';

function CitaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const [saldoCaja, setSaldoCaja] = useState(null);
  const [loadingSaldoCaja, setLoadingSaldoCaja] = useState(false);
  const [saldoCajaError, setSaldoCajaError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        setInfoMsg('');
        setSaldoCaja(null);
        setSaldoCajaError('');

        const data = await fetchCitaDetalle(id);
        setCita(data);

        if (data?.paciente?.id_paciente) {
          try {
            setLoadingSaldoCaja(true);
            const saldo = await obtenerSaldoPacienteCaja(
              data.paciente.id_paciente
            );
            setSaldoCaja(saldo || null);
          } catch (errSaldo) {
            console.error('[CitaDetalle] Error cargando saldo desde Caja:', errSaldo);
            setSaldoCajaError(
              errSaldo?.response?.data?.message ||
              errSaldo?.message ||
              'No se pudo cargar el saldo desde Caja.'
            );
          } finally {
            setLoadingSaldoCaja(false);
          }
        }
      } catch (err) {
        console.error('[CitaDetalle] Error cargando cita:', err);
        setError(
          err?.response?.data?.message ||
          err?.message ||
          'Error al cargar el detalle de la cita'
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getEstadoCitaBadgeClass(estado) {
    switch (estado) {
      case 'PROGRAMADA':
        return 'badge-programada';
      case 'CONFIRMADA':
        return 'badge-confirmada';
      case 'CANCELADA':
        return 'badge-cancelada';
      case 'ATENDIDA':
        return 'badge-atendida';
      default:
        return 'badge-muted';
    }
  }

  function getEstadoPagoBadgeClass(estadoPago) {
    switch (estadoPago) {
      case 'PAGADO':
        return 'badge-success';
      case 'PAGO_PARCIAL':
        return 'badge-warning';
      case 'PENDIENTE':
        return 'badge-danger';
      case 'SIN_PAGO':
      default:
        return 'badge-muted';
    }
  }

  async function handleRegistrarPagoParcial() {
    if (!cita) return;

    const montoStr = window.prompt(
      'Ingresa el monto del pago parcial (ejemplo: 500.00):'
    );

    if (montoStr === null) {
      return;
    }

    const montoNum = Number(montoStr);
    if (!montoStr || Number.isNaN(montoNum) || montoNum <= 0) {
      window.alert('El monto debe ser un número mayor que 0.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setInfoMsg('');

      const resp = await registrarPagoParcial(cita.id_cita, {
        monto: montoNum,
        origen: 'CAJA',
      });

      setCita((prev) =>
        prev
          ? {
              ...prev,
              estado_pago: resp.estado_pago,
              monto_pagado: resp.monto_pagado,
              saldo_pendiente: resp.saldo_pendiente,
            }
          : prev
      );

      setInfoMsg(resp.message || 'Pago registrado correctamente');
    } catch (err) {
      console.error('[CitaDetalle] Error registrando pago parcial:', err);
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al registrar el pago parcial'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegistrarPagoAnticipoEnCaja() {
    if (!cita) return;

    const confirm = window.confirm(
      'Se enviará el cobro del anticipo a la API de Caja. ¿Deseas continuar?'
    );
    if (!confirm) return;

    try {
      setSaving(true);
      setError('');
      setInfoMsg('');

      const resp = await registrarPagoAnticipoEnCaja(cita.id_cita);

      setInfoMsg(resp.mensaje || 'Cobro enviado a Caja');
    } catch (err) {
      console.error('[CitaDetalle] Error registrando anticipo en Caja:', err);
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al registrar el anticipo en Caja'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page-container"><p>Cargando detalle de la cita...</p></div>;
  }

  if (error && !cita) {
    return (
      <div className="page-container">
        <button
          className="btn-secondary btn-back"
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!cita) {
    return (
      <div className="page-container">
        <button
          className="btn-secondary btn-back"
          onClick={() => navigate(-1)}
        >
          ← Volver
        </button>
        <p>No se encontró la cita.</p>
      </div>
    );
  }

  const {
    folio_cita,
    fecha_registro,
    fecha_cita,
    estado_cita,
    estado_pago,
    monto_cobro,
    monto_pagado,
    saldo_pendiente,
    paciente,
    medico,
    tratamiento,
    anticipo,
  } = cita;

  const estadoCitaClass = getEstadoCitaBadgeClass(estado_cita);
  const estadoPagoClass = getEstadoPagoBadgeClass(estado_pago);

  return (
    <div className="page-container">
      <header className="page-header detail-header">
        <div className="detail-header-top">
          <button
            className="btn-secondary btn-back"
            type="button"
            onClick={() => navigate(-1)}
          >
            ← Volver
          </button>
        </div>

        <div className="detail-header-main">
          <div>
            <h2>Detalle de la cita</h2>
            <p className="detail-subtitle">
              Folio <span className="detail-folio">{folio_cita}</span>
            </p>
          </div>
          <div className="detail-header-meta">
            {estado_cita && (
              <span className={`badge ${estadoCitaClass}`}>
                {estado_cita}
              </span>
            )}
            {estado_pago && (
              <span className={`badge ${estadoPagoClass}`}>
                {estado_pago}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}
      {infoMsg && <p className="success-text">{infoMsg}</p>}
      {saving && <p>Guardando cambios...</p>}

      {/* Layout principal: info general + pagos */}
      <div className="detail-layout">
        {/* Columna izquierda */}
        <section className="card detail-section">
          <h3 className="detail-section-title">Datos generales</h3>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Fecha de registro</span>
              <span className="kv-value">{formatDateTime(fecha_registro)}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Fecha de la cita</span>
              <span className="kv-value">{formatDateTime(fecha_cita)}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Motivo</span>
              <span className="kv-value">
                {cita.motivo_cita || '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Medio de solicitud</span>
              <span className="kv-value">
                {cita.medio_solicitud || '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Observaciones</span>
              <span className="kv-value">
                {cita.observaciones || '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Columna derecha: pagos + Caja */}
        <section className="card detail-section">
          <h3 className="detail-section-title">Información de pago</h3>

          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Monto cobro</span>
              <span className="kv-value">
                {monto_cobro != null
                  ? `$${Number(monto_cobro).toFixed(2)}`
                  : '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Monto pagado (cita)</span>
              <span className="kv-value">
                {monto_pagado != null
                  ? `$${Number(monto_pagado).toFixed(2)}`
                  : '$0.00'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Saldo pendiente (cita)</span>
              <span className="kv-value">
                {saldo_pendiente != null
                  ? `$${Number(saldo_pendiente).toFixed(2)}`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="detail-subcard">
            <h4 className="detail-subtitle-2">
              Saldos en Caja (API caja-facturación)
            </h4>

            {loadingSaldoCaja && <p>Cargando saldo desde Caja…</p>}

            {saldoCajaError && (
              <p className="error-text" style={{ marginTop: '0.3rem' }}>
                {saldoCajaError}
              </p>
            )}

            {!loadingSaldoCaja && !saldoCajaError && saldoCaja && (
              <div className="kv-list" style={{ marginTop: '0.4rem' }}>
                <div className="kv-row">
                  <span className="kv-label">Total tratamientos (Caja)</span>
                  <span className="kv-value">
                    {saldoCaja.totalTratamientos != null
                      ? `$${Number(saldoCaja.totalTratamientos).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Total pagado (Caja)</span>
                  <span className="kv-value">
                    {saldoCaja.totalPagado != null
                      ? `$${Number(saldoCaja.totalPagado).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Saldo pendiente (Caja)</span>
                  <span className="kv-value">
                    {saldoCaja.saldoPendiente != null
                      ? `$${Number(saldoCaja.saldoPendiente).toFixed(2)}`
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            {!loadingSaldoCaja && !saldoCajaError && !saldoCaja && (
              <p style={{ marginTop: '0.3rem' }}>
                No se obtuvo información de Caja para este paciente.
              </p>
            )}
          </div>

          <div className="detail-actions">
            <button
              onClick={handleRegistrarPagoParcial}
              disabled={saving}
              className="btn"
              type="button"
            >
              Registrar pago parcial
            </button>

            {anticipo && anticipo.estado === 'PENDIENTE' && (
              <button
                onClick={handleRegistrarPagoAnticipoEnCaja}
                disabled={saving}
                className="btn"
                type="button"
              >
                Enviar anticipo a Caja
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Segunda fila: paciente / médico / tratamiento / anticipo */}
      <div className="detail-sections-row">
        <section className="card detail-section">
          <h3 className="detail-section-title">Paciente</h3>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Nombre</span>
              <span className="kv-value">
                {paciente
                  ? `${paciente.nombre} ${paciente.apellidos || ''}`
                  : '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Teléfono</span>
              <span className="kv-value">{paciente?.telefono || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Email</span>
              <span className="kv-value">{paciente?.email || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Canal preferente</span>
              <span className="kv-value">
                {paciente?.canal_preferente || '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="card detail-section">
          <h3 className="detail-section-title">Médico</h3>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Nombre</span>
              <span className="kv-value">
                {medico
                  ? `${medico.nombre} ${medico.apellidos || ''}`
                  : '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Especialidad</span>
              <span className="kv-value">
                {medico?.especialidad || '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Cédula</span>
              <span className="kv-value">
                {medico?.cedula_profesional || '—'}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="detail-sections-row">
        <section className="card detail-section detail-section-full">
          <h3 className="detail-section-title">Tratamiento</h3>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-label">Clave</span>
              <span className="kv-value">{tratamiento?.cve_trat || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Nombre</span>
              <span className="kv-value">{tratamiento?.nombre || '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Descripción</span>
              <span className="kv-value">
                {tratamiento?.descripcion || '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-label">Precio base</span>
              <span className="kv-value">
                {tratamiento?.precio_base != null
                  ? `$${Number(tratamiento.precio_base).toFixed(2)}`
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="card detail-section detail-section-full">
          <h3 className="detail-section-title">Anticipo</h3>
          {anticipo ? (
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Monto anticipo</span>
                <span className="kv-value">
                  {anticipo.monto_anticipo != null
                    ? `$${Number(anticipo.monto_anticipo).toFixed(2)}`
                    : '—'}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Estado</span>
                <span className="kv-value">{anticipo.estado}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">ID pago Caja</span>
                <span className="kv-value">
                  {anticipo.id_pago_caja || '—'}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Fecha solicitud</span>
                <span className="kv-value">
                  {formatDateTime(anticipo.fecha_solicitud)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Fecha confirmación</span>
                <span className="kv-value">
                  {formatDateTime(anticipo.fecha_confirmacion)}
                </span>
              </div>
            </div>
          ) : (
            <p>No hay anticipo registrado para esta cita.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default CitaDetalle;
//fin del documento 
