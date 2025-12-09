// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import CitasLista from './pages/CitasLista';
import CitaDetalle from './pages/CitaDetalle';
import CitaNueva from './pages/CitaNueva';
import PacientesLista from './pages/PacientesLista';
import PacienteNuevo from './pages/PacienteNuevo';
import MedicoNuevo from './pages/MedicoNuevo';
import TratamientoNuevo from './pages/TratamientoNuevo';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/citas" replace />} />
          <Route path="/citas" element={<CitasLista />} />
          <Route path="/citas/nueva" element={<CitaNueva />} />
          <Route path="/citas/:id" element={<CitaDetalle />} />

          <Route path="/pacientes" element={<PacientesLista />} />
          <Route path="/pacientes/nuevo" element={<PacienteNuevo />} />

          <Route path="/medicos/nuevo" element={<MedicoNuevo />} />
          <Route path="/tratamientos/nuevo" element={<TratamientoNuevo />} />

          <Route path="*" element={<Navigate to="/citas" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
//fin del documento