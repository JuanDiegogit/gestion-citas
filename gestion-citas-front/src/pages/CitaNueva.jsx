// src/pages/CitaNueva.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearCita, getMedicos, getTratamientos } from '../api/citasApi';

function CitaNueva() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    id_paciente: '',
    id_medico: '',
    id_tratamiento: '',
    fecha_cita: '',
    medio_solicitud: 'PRESENCIAL',
    motivo_cita: '',
    info_relevante: '',
    observaciones: '',
    requiere_anticipo: false,
    monto_anticipo: '',
  });

  const [medicos, setMedicos] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);

  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [loadingTratamientos, setLoadingTratamientos] = useState(false);

  const [errorMedicos, setErrorMedicos] = useState('');
  const [errorTratamientos, setErrorTratamientos] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar médicos y tratamientos
  useEffect(() => {
    async function loadMedicos() {
      try {
        setLoadingMedicos(true);
        setErrorMedicos('');
        const lista = await getMedicos();
        setMedicos(lista || []);
      } catch (err) {
        console.error(err);
        setErrorMedicos('No se pudieron cargar los médicos.');
      } finally {
        setLoadingMedicos(false);
      }
    }

    async function loadTratamientos() {
      try {
        setLoadingTratamientos(true);
        setErrorTratamientos('');
        const lista = await getTratamientos();
        setTratamientos(lista || []);
      } catch (err) {
        console.error(err);
        setErrorTratamientos('No se pudieron cargar los tratamientos.');
      } finally {
        setLoadingTratamientos(false);
      }
    }

    loadMedicos();
    loadTratamientos();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.id_paciente.trim()) {
      setError('Debes indicar el ID del paciente.');
      return;
    }
    if (!form.id_medico) {
      setError('Debes seleccionar un médico.');
      return;
    }
    if (!form.id_tratamiento) {
      setError('Debes seleccionar un tratamiento.');
      return;
    }
    if (!form.fecha_cita) {
      setError('Debes indicar la fecha y hora de la cita.');
      return;
    }

    if (
      form.requiere_anticipo &&
      (!form.monto_anticipo || Number(form.monto_anticipo) <= 0)
    ) {
      setError('Indica un monto de anticipo mayor a cero.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        id_paciente: parseInt(form.id_paciente, 10),
        id_medico: parseInt(form.id_medico, 10),
        id_tratamiento: parseInt(form.id_tratamiento, 10),
        monto_anticipo: form.requiere_anticipo
          ? Number(form.monto_anticipo)
          : null,
      };

      await crearCita(payload);

      setSuccess('Cita creada correctamente.');
      setTimeout(() => navigate('/citas'), 800);
    } catch (err) {
      console.error(err);
      setError('Error al crear la cita.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="page-title">Nueva cita</h2>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>ID Paciente</label>
              <input
                type="number"
                name="id_paciente"
                value={form.id_paciente}
                onChange={handleChange}
                placeholder="Ej. 1"
              />
              <small>Pendiente integrar buscador de paciente.</small>
            </div>

            <div className="form-field">
              <label>Médico</label>
              {loadingMedicos ? (
                <p>Cargando médicos…</p>
              ) : (
                <select
                  name="id_medico"
                  value={form.id_medico}
                  onChange={handleChange}
                >
                  <option value="">Selecciona un médico</option>
                  {medicos.map((m) => (
                    <option key={m.id_medico} value={m.id_medico}>
                      {m.nombre} {m.apellidos}
                      {m.especialidad ? ` – ${m.especialidad}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errorMedicos && <p className="error-text">{errorMedicos}</p>}
            </div>

            <div className="form-field">
              <label>Tratamiento</label>
              {loadingTratamientos ? (
                <p>Cargando tratamientos…</p>
              ) : (
                <select
                  name="id_tratamiento"
                  value={form.id_tratamiento}
                  onChange={handleChange}
                >
                  <option value="">Selecciona un tratamiento</option>
                  {tratamientos.map((t) => (
                    <option key={t.id_tratamiento} value={t.id_tratamiento}>
                      {t.cve_trat} – {t.nombre} ({t.precio_base})
                    </option>
                  ))}
                </select>
              )}
              {errorTratamientos && (
                <p className="error-text">{errorTratamientos}</p>
              )}
            </div>

            <div className="form-field">
              <label>Fecha y hora de la cita</label>
              <input
                type="datetime-local"
                name="fecha_cita"
                value={form.fecha_cita}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Medio de solicitud</label>
              <select
                name="medio_solicitud"
                value={form.medio_solicitud}
                onChange={handleChange}
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="TELEFONICA">Telefónica</option>
                <option value="EN_LINEA">En línea (web / mensaje)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Motivo de la cita</label>
              <textarea
                name="motivo_cita"
                value={form.motivo_cita}
                onChange={handleChange}
                placeholder="Descripción breve del motivo"
              />
            </div>

            <div className="form-field">
              <label>Información relevante</label>
              <textarea
                name="info_relevante"
                value={form.info_relevante}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Observaciones</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  name="requiere_anticipo"
                  checked={form.requiere_anticipo}
                  onChange={handleChange}
                />{' '}
                Esta cita requiere anticipo (cobro en Caja)
              </label>
              <small>
                Si marcas esta opción, se registrará un anticipo ligado a esta cita
                para que Caja pueda realizar el cobro.
              </small>
            </div>

            <div className="form-field">
              <label>Monto de anticipo (a cobrar en Caja)</label>
              <input
                type="number"
                step="0.01"
                name="monto_anticipo"
                value={form.monto_anticipo}
                onChange={handleChange}
                disabled={!form.requiere_anticipo}
                placeholder="0.00"
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/citas')}
            >
              Cancelar
            </button>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar cita'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CitaNueva;
