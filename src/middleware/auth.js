// middleware/auth.js
const { verifyToken, extractTokenFromHeader } = require('../utils/generateToken');
const logger = require('../utils/logger');


const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        logger.warn(`Intento de acceso sin token a recurso protegido (IP: ${req.ip || 'desconocida'})`);
        return res.status(401).json({ 
            error: 'Token no proporcionado',
            message: 'Debes incluir un token en el header Authorization: Bearer <token>'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        logger.warn(`Intento de acceso con token inválido o expirado (IP: ${req.ip || 'desconocida'})`);
        return res.status(403).json({ 
            error: 'Token inválido o expirado',
            message: 'El token ha expirado o es inválido. Inicia sesión nuevamente.'
        });
    }

    req.usuario = decoded;
    next();
};


const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            logger.warn(`Evaluación de rol fallida: No autenticado (IP: ${req.ip || 'desconocida'})`);
            return res.status(401).json({ 
                error: 'No autenticado',
                message: 'Debes iniciar sesión para acceder a este recurso'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.role)) {
            logger.warn(`Permisos insuficientes. Usuario ${req.usuario.email} (${req.usuario.role}) intentó acceder a ruta para roles [${rolesPermitidos.join(', ')}]`);
            return res.status(403).json({ 
                error: 'Permisos insuficientes',
                message: `Se requiere rol: ${rolesPermitidos.join(' o ')}. Tu rol actual: ${req.usuario.role}`,
                rolesPermitidos,
                rolActual: req.usuario.role
            });
        }

        next();
    };
};

module.exports = {
    verificarToken,
    verificarRol
};