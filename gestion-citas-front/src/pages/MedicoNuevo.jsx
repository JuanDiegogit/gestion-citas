// src/pages/MedicoNuevo.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearMedico } from '../api/citasApi';

function MedicoNuevo() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    especialidad: '',
    cedula_profesional: '',
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

    if (!form.nombre.trim() || !form.apellidos.trim()) {
      setError('Nombre y apellidos son obligatorios.');
      return;
    }

    try {
      setSaving(true);

      await crearMedico({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        especialidad: form.especialidad.trim() || null,
        cedula_profesional: form.cedula_profesional.trim() || null,
        activo: form.activo,
      });

      setSuccess('Médico registrado correctamente.');
      // si quieres mandarlo a otro lado:
      // navigate('/citas');
      setTimeout(() => navigate(-1), 800);
    } catch (err) {
      console.error(err);
      setError('Error al guardar el médico.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="page-title">Nuevo médico</h2>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre(s) del médico"
              />
            </div>

            <div className="form-field">
              <label>Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                placeholder="Apellidos del médico"
              />
            </div>

            <div className="form-field">
              <label>Especialidad</label>
              <input
                type="text"
                name="especialidad"
                value={form.especialidad}
                onChange={handleChange}
                placeholder="Ej. Ortodoncia"
              />
            </div>

            <div className="form-field">
              <label>Cédula profesional</label>
              <input
                type="text"
                name="cedula_profesional"
                value={form.cedula_profesional}
                onChange={handleChange}
                placeholder="Opcional"
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
                Médico activo
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
              {saving ? 'Guardando…' : 'Guardar médico'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default MedicoNuevo;
