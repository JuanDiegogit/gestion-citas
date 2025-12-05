// src/pages/CitaDetalle.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchCitaDetalle,
  iniciarAtencion,
  marcarAtendida,
  confirmarPago,
  obtenerSaldoPacienteCaja,   // 👈 nueva función
} from '../api/citasApi';

function CitaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // estado extra para saldo en Caja (consulta en tiempo real)
  const [saldoCaja, setSaldoCaja] = useState(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [errorSaldo, setErrorSaldo] = useState('');

  async function loadDetalle() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCitaDetalle(id);
      setCita(data);
      // cada vez que recargamos el detalle, limpiamos estado de saldo
      setSaldoCaja(null);
      setErrorSaldo('');
    } catch (err) {
      console.error(err);
      setError('Error al cargar el detalle de la cita');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleIniciarAtencion() {
    if (!window.confirm('¿Marcar cita como LISTA PARA INICIAR ATENCIÓN?')) return;
    try {
      await iniciarAtencion(id);
      await loadDetalle();
    } catch (err) {
      console.error(err);
      alert('Error al iniciar atención');
    }
  }

  async function handleMarcarAtendida() {
    if (!window.confirm('¿Marcar cita como ATENDIDA?')) return;
    try {
      await marcarAtendida(id);
      await loadDetalle();
    } catch (err) {
      console.error(err);
      alert('Error al marcar como atendida');
    }
  }

  async function handleConfirmarPago() {
    if (!cita) return;
    const idPagoCaja = window.prompt('Ingresa el ID de pago de Caja (anticipo):');
    if (!idPagoCaja) return;
    try {
      await confirmarPago(cita.id_cita, idPagoCaja);
      await loadDetalle();
    } catch (err) {
      console.error(err);
      alert('Error al registrar el pago del anticipo en Caja');
    }
  }

  // 👉 NUEVO: consultar saldo en Caja para el paciente de esta cita
  async function handleConsultarSaldoCaja() {
    if (!cita || !cita.paciente?.id_paciente) return;
    try {
      setLoadingSaldo(true);
      setErrorSaldo('');
      const resp = await obtenerSaldoPacienteCaja(cita.paciente.id_paciente);
      // aquí asumimos que Caja (a través de SIGCD) responde { saldo: number }
      // si tu API devuelve otra clave (ej. saldoActual), ajusta la línea de abajo
      const valorSaldo =
        resp.saldo ?? resp.saldoActual ?? resp.saldo_disponible ?? null;

      setSaldoCaja(valorSaldo);
      if (valorSaldo == null) {
        setErrorSaldo('Caja no devolvió un saldo numérico.');
      }
    } catch (err) {
      console.error(err);
      setErrorSaldo(
        err.message || 'No se pudo obtener el saldo desde Caja.'
      );
      setSaldoCaja(null);
    } finally {
      setLoadingSaldo(false);
    }
  }

  if (loading) return <p>Cargando detalle...</p>;
  if (error) return <p style={{ color: 'tomato' }}>{error}</p>;
  if (!cita) return <p>No se encontró la cita.</p>;

  const fecha = new Date(cita.fecha_cita);
  const fechaStr = fecha.toLocaleString();

  // Texto legible para estado de pago en Caja
  let estadoPagoCajaTexto = 'SIN_PAGO';
  if (cita.estado_pago) {
    if (cita.estado_pago === 'PAGADO') {
      estadoPagoCajaTexto = 'PAGADO (anticipo confirmado en Caja)';
    } else {
      estadoPagoCajaTexto = `${cita.estado_pago} (pendiente en Caja)`;
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        ← Volver
      </button>

      <h2>Detalle de cita</h2>

      {/* Datos generales de la cita */}
      <p><strong>Folio:</strong> {cita.folio_cita}</p>
      <p><strong>Fecha:</strong> {fechaStr}</p>
      <p><strong>Estado de la cita:</strong> {cita.estado_cita}</p>
      <p><strong>Medio de solicitud:</strong> {cita.medio_solicitud}</p>
      <p><strong>Motivo:</strong> {cita.motivo_cita || '—'}</p>
      <p><strong>Observaciones:</strong> {cita.observaciones || '—'}</p>

      <hr style={{ margin: '1rem 0' }} />

      {/* Paciente */}
      <h3>Paciente</h3>
      <p>{cita.paciente.nombre} {cita.paciente.apellidos}</p>
      <p>Teléfono: {cita.paciente.telefono || '—'}</p>
      <p>Email: {cita.paciente.email || '—'}</p>
      <p>Canal preferente: {cita.paciente.canal_preferente}</p>

      {/* Médico */}
      <h3>Médico</h3>
      <p>{cita.medico.nombre} {cita.medico.apellidos}</p>
      <p>Especialidad: {cita.medico.especialidad || '—'}</p>

      {/* Tratamiento */}
      <h3>Tratamiento</h3>
      <p>{cita.tratamiento.nombre}</p>
      <p>{cita.tratamiento.descripcion || '—'}</p>
      <p>Duración estimada: {cita.tratamiento.duracion_min} min</p>

      {/* Pago y anticipo (Caja) */}
      <h3>Pago y anticipo (Caja)</h3>
      <p>
        <strong>Estado de pago en Caja:</strong> {estadoPagoCajaTexto}
      </p>
      <p>
        <strong>Monto de anticipo/cobro registrado:</strong>{' '}
        {cita.monto_cobro != null ? `$${Number(cita.monto_cobro).toFixed(2)}` : '—'}
      </p>

      {cita.anticipo ? (
        <>
          <p>
            <strong>Anticipo registrado:</strong>{' '}
            {cita.anticipo.monto_anticipo != null
              ? `$${Number(cita.anticipo.monto_anticipo).toFixed(2)}`
              : '—'}
          </p>
          <p>
            <strong>Estado del anticipo:</strong> {cita.anticipo.estado}
          </p>
          <p>
            <strong>ID pago Caja:</strong>{' '}
            {cita.anticipo.id_pago_caja || '—'}
          </p>
        </>
      ) : (
        <p>Sin anticipo registrado para esta cita.</p>
      )}

      {/* 👇 Bloque de saldo en tiempo real */}
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn"
          onClick={handleConsultarSaldoCaja}
          disabled={loadingSaldo}
        >
          {loadingSaldo ? 'Consultando saldo en Caja…' : 'Consultar saldo actual en Caja'}
        </button>

        {saldoCaja != null && (
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Saldo actual del paciente en Caja:</strong>{' '}
            ${Number(saldoCaja).toFixed(2)}
          </p>
        )}

        {errorSaldo && (
          <p className="error-text" style={{ marginTop: '0.5rem' }}>
            {errorSaldo}
          </p>
        )}
      </div>

      <small style={{ display: 'block', marginTop: '0.5rem', opacity: 0.8 }}>
        Nota: la consulta de saldo se hace en tiempo real contra la API de Caja. El cobro
        real se realiza siempre en el sistema de Caja.
      </small>

      <hr style={{ margin: '1rem 0' }} />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={handleIniciarAtencion}>
          Iniciar atención
        </button>
        <button onClick={handleMarcarAtendida}>
          Marcar atendida
        </button>
        <button
          onClick={handleConfirmarPago}
          disabled={cita.estado_pago === 'PAGADO'}
        >
          {cita.estado_pago === 'PAGADO'
            ? 'Pago de anticipo ya confirmado'
            : 'Registrar pago de anticipo en Caja'}
        </button>
      </div>
    </div>
  );
}

export default CitaDetalle;
//fin del documento 