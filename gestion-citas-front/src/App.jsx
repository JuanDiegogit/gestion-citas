// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';

import CitasLista from './pages/CitasLista';
import CitaDetalle from './pages/CitaDetalle';
import CitaNueva from './pages/CitaNueva';

import PacientesLista from './pages/PacientesLista';
import PacienteNuevo from './pages/PacienteNuevo';

import MedicoNuevo from './pages/MedicoNuevo';
import TratamientoNuevo from './pages/TratamientoNuevo';

function App() {
  const navClass = ({ isActive }) =>
    isActive ? 'nav-link nav-link-active' : 'nav-link';

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <h1>Gestión de Citas - Clínica Dental</h1>

          <nav className="app-nav">
            <NavLink to="/citas" className={navClass}>
              Citas
            </NavLink>
            <NavLink to="/pacientes" className={navClass}>
              Pacientes
            </NavLink>
            <NavLink to="/medicos/nuevo" className={navClass}>
              Médicos
            </NavLink>
            <NavLink to="/tratamientos/nuevo" className={navClass}>
              Tratamientos
            </NavLink>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/citas" replace />} />

            {/* Citas */}
            <Route path="/citas" element={<CitasLista />} />
            <Route path="/citas/nueva" element={<CitaNueva />} />
            <Route path="/citas/:id" element={<CitaDetalle />} />

            {/* Pacientes */}
            <Route path="/pacientes" element={<PacientesLista />} />
            <Route path="/pacientes/nuevo" element={<PacienteNuevo />} />

            {/* Médicos */}
            <Route path="/medicos/nuevo" element={<MedicoNuevo />} />

            {/* Tratamientos */}
            <Route path="/tratamientos/nuevo" element={<TratamientoNuevo />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/citas" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
