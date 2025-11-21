// src/pages/TratamientoNuevo.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearTratamiento } from '../api/citasApi';

function TratamientoNuevo() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cve_trat: '',
    nombre: '',
    descripcion: '',
    precio_base: '',
    duracion_min: '',
    activo: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    if (!form.cve_trat.trim() || !form.nombre.trim()) {
      setError('Clave y nombre son obligatorios.');
      return;
    }
    if (!form.precio_base || Number(form.precio_base) <= 0) {
      setError('Indica un precio base mayor a cero.');
      return;
    }

    try {
      setSaving(true);

      await crearTratamiento({
        cve_trat: form.cve_trat.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio_base: Number(form.precio_base),
        duracion_min: form.duracion_min
          ? Number(form.duracion_min)
          : null,
        activo: form.activo,
      });

      setSuccess('Tratamiento registrado correctamente.');
      setTimeout(() => navigate(-1), 800);
    } catch (err) {
      console.error(err);
      setError('Error al guardar el tratamiento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="page-title">Nuevo tratamiento</h2>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Clave de tratamiento</label>
              <input
                type="text"
                name="cve_trat"
                value={form.cve_trat}
                onChange={handleChange}
                placeholder="Ej. LIMPIEZA, ORTO-BASICA"
              />
            </div>

            <div className="form-field">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre del tratamiento"
              />
            </div>

            <div className="form-field">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </div>

            <div className="form-field">
              <label>Precio base</label>
              <input
                type="number"
                step="0.01"
                name="precio_base"
                value={form.precio_base}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="form-field">
              <label>Duración (minutos)</label>
              <input
                type="number"
                name="duracion_min"
                value={form.duracion_min}
                onChange={handleChange}
                placeholder="Ej. 45"
              />
            </div>

            <div className="form-field">
              <label>
                <input
                  type="checkbox"
                  name="activo"
                  checked={form.activo}
                  onChange={handleChange}
                />{' '}
                Tratamiento activo
              </label>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar tratamiento'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default TratamientoNuevo;
