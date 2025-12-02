// src/pages/CitasLista.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCitasResumen,
  iniciarAtencion,
  marcarAtendida,
  registrarPagoAnticipoEnCaja,
} from '../api/citasApi';

export default function CitasLista() {
  const navigate = useNavigate();

  const [citas, setCitas] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [estadoFiltro, setEstadoFiltro] = useState('TODOS');
  const [idMedicoFiltro, setIdMedicoFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCitas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, idMedicoFiltro, fechaDesde, fechaHasta]);

  async function loadCitas(p = 1) {
    try {
      setLoading(true);
      setError('');
      const params = { page: p, pageSize };
      if (estadoFiltro !== 'TODOS') params.estado_cita = estadoFiltro;
      if (idMedicoFiltro) params.id_medico = idMedicoFiltro;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const data = await fetchCitasResumen(params);
      setCitas(data.citas || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch (err) {
      console.error('Error cargando citas:', err);
      setError('Error cargando las citas.');
    } finally {
      setLoading(false);
    }
  }

  async function handleIniciarAtencion(cita) {
    if (!window.confirm(`¿Iniciar atención de la cita ${cita.folio_cita}?`)) return;
    try {
      setLoading(true);
      await iniciarAtencion(cita.id_cita);
      await loadCitas(page);
    } catch (err) {
      console.error('Error iniciando atención:', err);
      setError('No se pudo iniciar la atención.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarcarAtendida(cita) {
    if (!window.confirm(`¿Marcar como ATENDIDA la cita ${cita.folio_cita}?`)) return;
    try {
      setLoading(true);
      await marcarAtendida(cita.id_cita);
      await loadCitas(page);
    } catch (err) {
      console.error('Error marcando cita como atendida:', err);
      setError('No se pudo marcar como atendida.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmarPago(cita) {
    try {
      setLoading(true);
      await registrarPagoAnticipoEnCaja(cita.id_cita);
      await loadCitas(page);
    } catch (err) {
      console.error('Error registrando pago de anticipo:', err);
      setError('No se pudo registrar el pago de anticipo.');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="citas-page">
      <div className="citas-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agenda de citas</h1>
        <button className="btn-primary" onClick={() => navigate('/citas/nueva')}>
          + Nueva cita
        </button>
      </div>

      <section className="citas-filtros">
        <form
          className="citas-filtros-form"
          onSubmit={(e) => { e.preventDefault(); loadCitas(1); }}
        >
          <div className="filtro-item">
            <label>Estado de cita</label>
            <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="PROGRAMADA">PROGRAMADA</option>
              <option value="CONFIRMADA">CONFIRMADA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="ATENDIDA">ATENDIDA</option>
            </select>
          </div>

          <div className="filtro-item">
            <label>ID Médico</label>
            <input
              type="number"
              value={idMedicoFiltro}
              onChange={e => setIdMedicoFiltro(e.target.value)}
              placeholder="Ej. 1"
            />
          </div>

          <div className="filtro-item">
            <label>Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="filtro-item">
            <label>Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>

          <div className="filtro-item" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="submit" className="btn">Aplicar filtros</button>
            <button type="button" className="btn-secondary" onClick={() => {
              setEstadoFiltro('TODOS');
              setIdMedicoFiltro('');
              setFechaDesde('');
              setFechaHasta('');
            }}>Limpiar filtros</button>
          </div>
        </form>
      </section>

      <section className="citas-tabla-section">
        {loading && <p>Cargando citas...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && citas.length === 0 && <p>No hay citas con esos filtros.</p>}

        {!loading && citas.length > 0 && (
          <>
            <table className="citas-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Estado cita</th>
                  <th>Estado pago (Caja)</th>
                  <th style={{ width: '360px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map(cita => {
                  const fecha = new Date(cita.fecha_cita);
                  const fechaStr = fecha.toLocaleString();

                  let estadoPagoCajaTexto = 'SIN_PAGO';
                  if (cita.estado_pago === 'PAGADO') {
                    estadoPagoCajaTexto = 'PAGADO (confirmado en Caja)';
                  } else if (cita.tiene_anticipo) {
                    estadoPagoCajaTexto = 'SIN_ANTICIPO (pendiente en Caja)';
                  }

                  return (
                    <tr key={cita.id_cita}>
                      <td>{cita.folio_cita}</td>
                      <td>{fechaStr}</td>
                      <td>{cita.paciente_nombre}</td>
                      <td>{cita.medico_nombre}</td>
                      <td>{cita.estado_cita}</td>
                      <td>{estadoPagoCajaTexto}</td>
                      <td style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <button className="btn" type="button" onClick={() => navigate(`/citas/${cita.id_cita}`)}>
                          Ver detalle
                        </button>
                        <button className="btn" type="button" onClick={() => handleIniciarAtencion(cita)}>
                          Iniciar atención
                        </button>
                        <button className="btn" type="button" onClick={() => handleMarcarAtendida(cita)}>
                          Marcar atendida
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleConfirmarPago(cita)}
                          disabled={cita.estado_pago === 'PAGADO' || loading}
                        >
                          {cita.estado_pago === 'PAGADO'
                            ? 'Pago confirmado'
                            : 'Registrar pago de anticipo en Caja'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="citas-paginacion">
              <button
                className="btn"
                type="button"
                disabled={page <= 1}
                onClick={() => loadCitas(page - 1)}
              >
                &lt; Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn"
                type="button"
                disabled={page >= totalPages}
                onClick={() => loadCitas(page + 1)}
              >
                Siguiente &gt;
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
//fin del documento