// src/components/Layout.jsx
import { NavLink } from 'react-router-dom';

const navClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link';

export default function Layout({ children }) {
  return (
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

      <main className="app-main">{children}</main>
    </div>
  );
}
//Fin del documento