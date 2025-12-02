// src/utils/generarFolioCita.js
function generarFolioCita(fecha = new Date()) {
  const pad = (n) => n.toString().padStart(2, '0');

  const anio = fecha.getFullYear();
  const mes = pad(fecha.getMonth() + 1);
  const dia = pad(fecha.getDate());
  const hora = pad(fecha.getHours());
  const min = pad(fecha.getMinutes());
  const seg = pad(fecha.getSeconds());

  return `CITA-${anio}${mes}${dia}-${hora}${min}${seg}`;
}

module.exports = { generarFolioCita };
//Fin del documento