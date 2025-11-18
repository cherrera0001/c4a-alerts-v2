export function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function error(res, message, statusCode = 400, details = null) {
  const response = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

export function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: "Error de validación",
    details: errors,
  });
}

export function notFound(res, resource = "Recurso") {
  return res.status(404).json({
    success: false,
    error: `${resource} no encontrado`,
  });
}

export function unauthorized(res, message = "No autorizado") {
  return res.status(401).json({
    success: false,
    error: message,
  });
}

export function forbidden(res, message = "Acceso prohibido") {
  return res.status(403).json({
    success: false,
    error: message,
  });
}

export function serverError(res, message = "Error interno del servidor") {
  return res.status(500).json({
    success: false,
    error: message,
  });
}

