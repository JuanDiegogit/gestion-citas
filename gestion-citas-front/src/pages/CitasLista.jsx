// src/pages/CitasLista.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCitasResumen,
  iniciarAtencion,
  marcarAtendida,
  confirmarPago,
} from '../api/citasApi';

function CitasLista() {
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

  async function loadCitas(p = page) {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: p,
        pageSize,
      };

      if (estadoFiltro !== 'TODOS') params.estado_cita = estadoFiltro;
      if (idMedicoFiltro) params.id_medico = idMedicoFiltro;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const data = await fetchCitasResumen(params);
      // ahora data = { data: [...], pagination: {...} }
      setCitas(data.citas || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch (err) {
      console.error(err);
      setError('Error al cargar las citas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCitas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, idMedicoFiltro, fechaDesde, fechaHasta]);

  function handleLimpiarFiltros() {
    setEstadoFiltro('TODOS');
    setIdMedicoFiltro('');
    setFechaDesde('');
    setFechaHasta('');
  }

  async function handleIniciarAtencion(cita) {
    if (!window.confirm(`¿Iniciar atención de la cita ${cita.folio_cita}?`)) return;
    try {
      await iniciarAtencion(cita.id_cita);
      await loadCitas();
    } catch (err) {
      console.error(err);
      alert('Error al iniciar atención');
    }
  }

  async function handleMarcarAtendida(cita) {
    if (
      !window.confirm(
        `¿Marcar como ATENDIDA la cita ${cita.folio_cita}?`
      )
    )
      return;
    try {
      await marcarAtendida(cita.id_cita);
      await loadCitas();
    } catch (err) {
      console.error(err);
      alert('Error al marcar como atendida');
    }
  }

  async function handleConfirmarPago(cita) {
    const idPagoCaja = window.prompt(
      `Ingresa el ID de pago de Caja para la cita ${cita.folio_cita}:`
    );
    if (!idPagoCaja) return;
    try {
      await confirmarPago(cita.id_cita, idPagoCaja);
      await loadCitas();
    } catch (err) {
      console.error(err);
      alert('Error al registrar el pago del anticipo en Caja');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="citas-page">
      {/* Encabezado */}
      <div className="citas-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Agenda de citas</h1>
        <button
          className="btn-primary"
          type="button"
          onClick={() => navigate('/citas/nueva')}
        >
          + Nueva cita
        </button>
      </div>

      {/* Filtros */}
      <section className="citas-filtros">
        <form
          className="citas-filtros-form"
          onSubmit={(e) => {
            e.preventDefault();
            loadCitas(1);
          }}
        >
          <div className="filtro-item">
            <label>Estado de cita</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
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
              onChange={(e) => setIdMedicoFiltro(e.target.value)}
              placeholder="Ej. 1"
            />
          </div>

          <div className="filtro-item">
            <label>Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="filtro-item">
            <label>Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>

          <div className="filtro-item" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="submit" className="btn">
              Aplicar filtros
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLimpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      {/* Tabla */}
      <section className="citas-tabla-section">
        {loading && <p>Cargando citas...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && citas.length === 0 && (
          <p>No hay citas con esos filtros.</p>
        )}

        {!loading && citas.length > 0 && (
          <>
            <table className="citas-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Estado de cita</th>
                  <th>Estado de pago (Caja)</th>
                  <th style={{ width: '360px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => {
                  const fecha = new Date(cita.fecha_cita);
                  const fechaStr = fecha.toLocaleString();

                  let estadoPagoCajaTexto = 'SIN_PAGO';
                  if (cita.estado_pago) {
                    if (cita.estado_pago === 'PAGADO') {
                      estadoPagoCajaTexto = 'PAGADO (confirmado en Caja)';
                    } else {
                      estadoPagoCajaTexto = `${cita.estado_pago} (pendiente en Caja)`;
                    }
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
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => navigate(`/citas/${cita.id_cita}`)}
                          >
                            Ver detalle
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => handleIniciarAtencion(cita)}
                          >
                            Iniciar atención
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => handleMarcarAtendida(cita)}
                          >
                            Marcar atendida
                          </button>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => handleConfirmarPago(cita)}
                            disabled={cita.estado_pago === 'PAGADO'}
                          >
                            {cita.estado_pago === 'PAGADO'
                              ? 'Pago ya confirmado'
                              : 'Registrar pago de anticipo en Caja'}
                          </button>
                        </div>
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

export default CitasLista;
