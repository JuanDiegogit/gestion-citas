// src/pages/CitaDetalle.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchCitaDetalle,
  registrarPagoParcial,
  registrarPagoAnticipoEnCaja,
} from '../api/citasApi';

function CitaDetalle() {
  const { id } = useParams(); // id de la cita desde la ruta
  const navigate = useNavigate();

  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Cargar detalle de la cita al entrar
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchCitaDetalle(id);
        setCita(data);
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

      // resp = {
      //   message,
      //   id_cita,
      //   id_pago_cita,
      //   estado_pago,
      //   monto_pagado,
      //   saldo_pendiente,
      // }

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
    saldo_paciente,
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
          <strong>Monto pagado:</strong>{' '}
          {monto_pagado != null ? `$${Number(monto_pagado).toFixed(2)}` : '$0.00'}
        </p>
        <p>
          <strong>Saldo pendiente:</strong>{' '}
          {saldo_pendiente != null
            ? `$${Number(saldo_pendiente).toFixed(2)}`
            : '-'}
        </p>
        <p>
          <strong>Saldo paciente (general):</strong>{' '}
          {saldo_paciente != null
            ? `$${Number(saldo_paciente).toFixed(2)}`
            : '-'}
        </p>

        <div style={{ marginTop: '0.5rem' }}>
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
//fin del documento 