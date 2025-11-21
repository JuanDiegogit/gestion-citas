// src/pages/PacienteNuevo.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearPaciente } from '../api/citasApi';

function PacienteNuevo() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    canal_preferente: 'WHATSAPP',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim() || !form.apellidos.trim()) {
      setError('Nombre y apellidos son obligatorios.');
      return;
    }

    try {
      setSaving(true);

      await crearPaciente({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        fecha_nacimiento: form.fecha_nacimiento || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        canal_preferente: form.canal_preferente || null,
      });

      // después de guardar, regresamos a la lista
      navigate('/pacientes');
    } catch (err) {
      console.error('Error al crear paciente:', err);
      setError('No se pudo guardar el paciente. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelar() {
    navigate('/pacientes');
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h2>Nueva ficha de paciente</h2>
        <p>Registra los datos básicos del paciente para poder agendarle citas.</p>
      </header>

      <section className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">
              Nombre<span className="required">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              className="form-input"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">
              Apellidos<span className="required">*</span>
            </label>
            <input
              type="text"
              name="apellidos"
              className="form-input"
              value={form.apellidos}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Fecha de nacimiento</label>
            <input
              type="date"
              name="fecha_nacimiento"
              className="form-input"
              value={form.fecha_nacimiento}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              className="form-input"
              value={form.telefono}
              onChange={handleChange}
              placeholder="6620000000"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              placeholder="paciente@ejemplo.com"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Canal preferente</label>
            <select
              name="canal_preferente"
              className="form-input"
              value={form.canal_preferente}
              onChange={handleChange}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="TELEFONO">Teléfono</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelar}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar paciente'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default PacienteNuevo;
