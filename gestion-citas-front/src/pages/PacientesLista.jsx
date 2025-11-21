// src/pages/PacientesLista.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../api/citasApi';

function PacientesLista() {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [q, setQ] = useState('');
  const [canal, setCanal] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function cargarDatos(p = page) {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: p,
        pageSize,
      };

      if (q.trim()) params.q = q.trim();
      if (canal !== 'TODOS') params.canal_preferente = canal;

      const data = await getPacientes(params);
      setPacientes(data.pacientes || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch (err) {
      console.error(err);
      setError('Error al cargar pacientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal]);

  function handleSubmit(e) {
    e.preventDefault();
    cargarDatos(1);
  }

  function handleLimpiar() {
    setQ('');
    setCanal('TODOS');
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="citas-page">
      <div className="citas-header">
        <h1>Pacientes - Clínica Dental</h1>
      </div>

      {/* Filtros */}
      <section className="citas-filtros">
        <form className="citas-filtros-form" onSubmit={handleSubmit}>
          <div className="filtro-item">
            <label>Buscar</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, apellidos o email"
            />
          </div>

          <div className="filtro-item">
            <label>Canal preferente</label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">EMAIL</option>
              <option value="LLAMADA">LLAMADA</option>
            </select>
          </div>

          <div className="filtro-item" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="submit" className="btn">
              Buscar
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLimpiar}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/pacientes/nuevo')}
            >
              + Nuevo paciente
            </button>
          </div>
        </form>
      </section>

      {/* Tabla */}
      <section className="citas-tabla-section">
        {loading && <p>Cargando pacientes...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && pacientes.length === 0 && (
          <p>No hay pacientes con esos filtros.</p>
        )}

        {!loading && pacientes.length > 0 && (
          <>
            <table className="citas-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre completo</th>
                  <th>Fecha nacimiento</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Canal preferente</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => {
                  const fecha = p.fecha_nacimiento
                    ? new Date(p.fecha_nacimiento).toLocaleDateString()
                    : '—';
                  return (
                    <tr key={p.id_paciente}>
                      <td>{p.id_paciente}</td>
                      <td>
                        {p.nombre} {p.apellidos}
                      </td>
                      <td>{fecha}</td>
                      <td>{p.telefono || '—'}</td>
                      <td>{p.email || '—'}</td>
                      <td>{p.canal_preferente}</td>
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
                onClick={() => cargarDatos(page - 1)}
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
                onClick={() => cargarDatos(page + 1)}
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

export default PacientesLista;
