// src/middlewares/errorHandler.js

/**
 * Middleware global de manejo de errores para Express.
 *
 * Cualquier error que pase por `next(err)` o se lance en una ruta/servicio
 * termina aquí.
 */
function errorHandler(err, req, res, next) {
  // Por si algún middleware intenta seguir después de enviar respuesta
  if (res.headersSent) {
    return next(err);
  }

  // Código HTTP (por defecto 500)
  const statusCode = err.statusCode && Number.isInteger(err.statusCode)
    ? err.statusCode
    : 500;

  // Código interno opcional (por ejemplo, 'VALIDATION_ERROR', 'DB_ERROR', etc.)
  const internalCode = err.code || err.internalCode || null;

  // Mensaje seguro para el cliente
  const message =
    statusCode >= 500
      ? 'Error interno del servidor'
      : err.message || 'Error en la solicitud';

  // Log completo para el servidor
  console.error('[ERROR_HANDLER] Error procesando petición:', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    internalCode,
    stack: err.stack,
  });

  const responseBody = {
    error: message,
  };

  if (internalCode) {
    responseBody.code = internalCode;
  }

  // En desarrollo, opcionalmente exponemos más detalle
  if (process.env.NODE_ENV === 'development') {
    responseBody.debug = {
      originalMessage: err.message,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;
