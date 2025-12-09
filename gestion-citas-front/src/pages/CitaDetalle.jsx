// src/pages/CitaDetalle.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchCitaDetalle,
  registrarPagoParcial,
  registrarPagoAnticipoEnCaja,
  obtenerSaldoPacienteCaja, // <<< importante: usar saldo desde Caja
} from '../api/citasApi';

function CitaDetalle() {
  const { id } = useParams(); // id de la cita desde la ruta
  const navigate = useNavigate();

  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // estado para el saldo de Caja (API caja-facturación)
  const [saldoCaja, setSaldoCaja] = useState(null);
  const [loadingSaldoCaja, setLoadingSaldoCaja] = useState(false);
  const [saldoCajaError, setSaldoCajaError] = useState('');

  // Cargar detalle de la cita al entrar
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

        // Si hay paciente, consultamos también el saldo en Caja
        if (data?.paciente?.id_paciente) {
          try {
            setLoadingSaldoCaja(true);
            const saldo = await obtenerSaldoPacienteCaja(
              data.paciente.id_paciente
            );
            // saldo es lo que responda Caja: se asume algo tipo:
            // { saldo_paciente, total_tratamientos, total_pagado, saldo_pendiente }
            setSaldoCaja(saldo || null);
          } catch (errSaldo) {
            console.error(
              '[CitaDetalle] Error cargando saldo desde Caja:',
              errSaldo
            );
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
    return d.toLocaleString();
  }

  async function handleRegistrarPagoParcial() {
    if (!cita) return;

    const montoStr = window.prompt(
      'Ingresa el monto del pago parcial (ejemplo: 500.00):'
    );

    if (montoStr === null) {
      // cancelado
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
        // puedes cambiar el origen si gustas: 'CAJA', 'EFECTIVO', etc.
        origen: 'CAJA',
      });

      // Actualizamos sólo los campos relacionados al pago
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
      // Opcional: si quieres, podrías volver a pedir saldo a Caja aquí.
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

      // resp.mensaje y resp.caja.* según lo que regreses del backend
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
    return <div>Cargando detalle de la cita...</div>;
  }

  if (error && !cita) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  if (!cita) {
    return (
      <div>
        <p>No se encontró la cita.</p>
        <button onClick={() => navigate(-1)}>Volver</button>
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
    saldo_paciente, // este viene de SIGCD (columna en tabla citas)
    paciente,
    medico,
    tratamiento,
    anticipo,
  } = cita;

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Detalle de la Cita</h2>

      <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        ← Volver
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {infoMsg && <p style={{ color: 'green' }}>{infoMsg}</p>}
      {saving && <p>Guardando cambios...</p>}

      <section style={{ marginBottom: '1rem' }}>
        <h3>Datos generales</h3>
        <p>
          <strong>Folio:</strong> {folio_cita}
        </p>
        <p>
          <strong>Fecha registro:</strong> {formatDateTime(fecha_registro)}
        </p>
        <p>
          <strong>Fecha cita:</strong> {formatDateTime(fecha_cita)}
        </p>
        <p>
          <strong>Estado cita:</strong> {estado_cita}
        </p>
        <p>
          <strong>Estado pago:</strong> {estado_pago}
        </p>
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <h3>Paciente</h3>
        <p>
          <strong>Nombre:</strong>{' '}
          {paciente
            ? `${paciente.nombre} ${paciente.apellidos || ''}`
            : '-'}
        </p>
        <p>
          <strong>Teléfono:</strong> {paciente?.telefono || '-'}
        </p>
        <p>
          <strong>Email:</strong> {paciente?.email || '-'}
        </p>
        <p>
          <strong>Canal preferente:</strong>{' '}
          {paciente?.canal_preferente || '-'}
        </p>
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <h3>Médico</h3>
        <p>
          <strong>Nombre:</strong>{' '}
          {medico ? `${medico.nombre} ${medico.apellidos || ''}` : '-'}
        </p>
        <p>
          <strong>Especialidad:</strong> {medico?.especialidad || '-'}
        </p>
        <p>
          <strong>Cédula:</strong> {medico?.cedula_profesional || '-'}
        </p>
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <h3>Tratamiento</h3>
        <p>
          <strong>Clave:</strong> {tratamiento?.cve_trat || '-'}
        </p>
        <p>
          <strong>Nombre:</strong> {tratamiento?.nombre || '-'}
        </p>
        <p>
          <strong>Descripción:</strong>{' '}
          {tratamiento?.descripcion || '-'}
        </p>
        <p>
          <strong>Precio base:</strong>{' '}
          {tratamiento?.precio_base != null
            ? `$${Number(tratamiento.precio_base).toFixed(2)}`
            : '-'}
        </p>
      </section>

      <section style={{ marginBottom: '1rem' }}>
        <h3>Información de pago</h3>
        <p>
          <strong>Monto cobro:</strong>{' '}
          {monto_cobro != null ? `$${Number(monto_cobro).toFixed(2)}` : '-'}
        </p>
        <p>
          <strong>Monto pagado (cita):</strong>{' '}
          {monto_pagado != null
            ? `$${Number(monto_pagado).toFixed(2)}`
            : '$0.00'}
        </p>
        <p>
          <strong>Saldo pendiente (cita):</strong>{' '}
          {saldo_pendiente != null
            ? `$${Number(saldo_pendiente).toFixed(2)}`
            : '-'}
        </p>
        <p>
          <strong>Saldo paciente (guardado en SIGCD):</strong>{' '}
          {saldo_paciente != null
            ? `$${Number(saldo_paciente).toFixed(2)}`
            : '-'}
        </p>

        {/* Bloque con info en vivo desde CAJA */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #4b5563',
            backgroundColor: '#020617',
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '0.35rem' }}>
            Saldos en Caja (API caja-facturación)
          </h4>

          {loadingSaldoCaja && <p>Cargando saldo desde Caja…</p>}

          {saldoCajaError && (
            <p style={{ color: 'orange' }}>{saldoCajaError}</p>
          )}

          {!loadingSaldoCaja && !saldoCajaError && saldoCaja && (
            <>
              <p>
                <strong>Saldo paciente (Caja):</strong>{' '}
                {saldoCaja.saldo_paciente != null
                  ? `$${Number(saldoCaja.saldo_paciente).toFixed(2)}`
                  : '-'}
              </p>
              <p>
                <strong>Total tratamientos (Caja):</strong>{' '}
                {saldoCaja.total_tratamientos != null
                  ? `$${Number(
                      saldoCaja.total_tratamientos
                    ).toFixed(2)}`
                  : '-'}
              </p>
              <p>
                <strong>Total pagado (Caja):</strong>{' '}
                {saldoCaja.total_pagado != null
                  ? `$${Number(saldoCaja.total_pagado).toFixed(2)}`
                  : '-'}
              </p>
              <p>
                <strong>Saldo pendiente (Caja):</strong>{' '}
                {saldoCaja.saldo_pendiente != null
                  ? `$${Number(
                      saldoCaja.saldo_pendiente
                    ).toFixed(2)}`
                  : '-'}
              </p>
            </>
          )}

          {!loadingSaldoCaja && !saldoCajaError && !saldoCaja && (
            <p>No se obtuvo información de Caja para este paciente.</p>
          )}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={handleRegistrarPagoParcial}
            disabled={saving}
            style={{ marginRight: '0.5rem' }}
          >
            Registrar pago parcial
          </button>

          {anticipo && anticipo.estado === 'PENDIENTE' && (
            <button
              onClick={handleRegistrarPagoAnticipoEnCaja}
              disabled={saving}
            >
              Enviar anticipo a Caja
            </button>
          )}
        </div>
      </section>

      <section>
        <h3>Anticipo</h3>
        {anticipo ? (
          <>
            <p>
              <strong>Monto anticipo:</strong>{' '}
              {anticipo.monto_anticipo != null
                ? `$${Number(anticipo.monto_anticipo).toFixed(2)}`
                : '-'}
            </p>
            <p>
              <strong>Estado:</strong> {anticipo.estado}
            </p>
            <p>
              <strong>ID pago Caja:</strong>{' '}
              {anticipo.id_pago_caja || '-'}
            </p>
            <p>
              <strong>Fecha solicitud:</strong>{' '}
              {formatDateTime(anticipo.fecha_solicitud)}
            </p>
            <p>
              <strong>Fecha confirmación:</strong>{' '}
              {formatDateTime(anticipo.fecha_confirmacion)}
            </p>
          </>
        ) : (
          <p>No hay anticipo registrado para esta cita.</p>
        )}
      </section>
    </div>
  );
}

export default CitaDetalle;
// fin del documento