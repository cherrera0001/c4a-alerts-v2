# C4A Alerts Backend

Backend API para el sistema de alertas C4A, construido con Node.js, Express y Firebase Firestore.

## Tecnologías

- Node.js 20+
- Express
- Firebase Admin (Firestore)
- Zod para validación
- JWT para autenticación
- Helmet, CORS, rate limiting, sanitización de inputs
- Winston para logging estructurado

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuración (Firebase, CORS, Security)
│   ├── controllers/     # Controladores de rutas
│   ├── middlewares/     # Middlewares (auth, validate, error, rateLimit, sanitize)
│   ├── routes/          # Definición de rutas
│   ├── schemas/         # Schemas de validación Zod
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades (JWT, logger, httpResponses)
│   └── server.js        # Entrypoint
├── package.json
└── README.md
```

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` en el directorio `backend/` con las siguientes variables:

```env
# Puerto del servidor
PORT=3001

# JWT
JWT_SECRET=CHANGE_ME_NOW_USE_A_STRONG_SECRET_IN_PRODUCTION

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# SMTP para notificaciones por email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@c4a-alerts.com

# Twilio para WhatsApp (opcional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Logging
LOG_LEVEL=DEBUG
NODE_ENV=development
```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Modelos de Datos en Firestore

### users
- `id` (string)
- `email` (string)
- `name` (string)
- `role` (enum: "admin", "analyst", "viewer")
- `whatsapp` (string, opcional)
- `organizationId` (string)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### assets
- `id` (string)
- `organizationId` (string)
- `name` (string)
- `type` (enum: "API", "WEB", "APP", "NETWORK", "OTHER")
- `criticality` (enum: "LOW", "MEDIUM", "HIGH", "CRITICAL")
- `tags` (array of strings)
- `metadata` (object)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### alerts
- `id` (string)
- `organizationId` (string)
- `userId` (string)
- `assetId` (string, opcional)
- `type` (enum: "INFO", "WARNING", "CRITICAL")
- `title` (string)
- `description` (string)
- `source` (enum: "CTI_FEED", "INTERNAL_LOG", "MANUAL", "OTHER")
- `cveIds` (array of strings)
- `tactics` (array of strings - MITRE ATT&CK)
- `metadata` (object)
- `createdAt` (timestamp)

### cti_items
- `id` (string)
- `source` (enum: "MISP", "NVD", "RSS", "MANUAL", "OTHER")
- `title` (string)
- `summary` (string)
- `cveIds` (array of strings)
- `cwes` (array of strings)
- `actors` (array of strings)
- `sector` (array of strings)
- `regions` (array of strings)
- `references` (array of strings)
- `severity` (enum: "LOW", "MEDIUM", "HIGH", "CRITICAL")
- `publishedAt` (datetime, opcional)
- `ingestedAt` (timestamp)
- `enriched` (boolean)
- `enrichmentData` (object)

## Rutas API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener perfil del usuario autenticado
- `PATCH /api/auth/profile` - Actualizar perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Alertas
- `GET /api/alerts` - Listar alertas del usuario (con filtros y paginación)
- `POST /api/alerts` - Crear nueva alerta

### Activos
- `GET /api/assets` - Listar activos de la organización
- `GET /api/assets/:id` - Obtener activo por ID
- `POST /api/assets` - Crear nuevo activo
- `PUT /api/assets/:id` - Actualizar activo
- `DELETE /api/assets/:id` - Eliminar activo

### CTI (Inteligencia de Amenazas)
- `POST /api/cti/items` - Ingestar item CTI manualmente
- `GET /api/cti/items` - Listar items CTI (con filtros y paginación)
- `POST /api/cti/items/:id/enrich` - Enriquecer item CTI

### Health
- `GET /health` - Health check

## Seguridad

- **Helmet**: Configurado con CSP razonable
- **CORS**: Whitelist por variable de entorno
- **Rate Limiting**: Global + por ruta sensible (auth, alerts)
- **Sanitización**: Prevención de XSS en inputs
- **Validación**: Schemas Zod para todas las entradas
- **Autenticación**: JWT con middleware `authRequired`
- **Autorización**: Middleware `authorize` para roles (admin, analyst, viewer)

## Notificaciones

El servicio de notificaciones envía alertas según la severidad:

- **INFO**: Solo correo electrónico
- **WARNING**: Correo + registro en panel
- **CRITICAL**: Correo + WhatsApp (si configurado) + Telegram (si configurado)

## Logging

El sistema utiliza logging estructurado con niveles:
- `ERROR`: Errores críticos
- `WARN`: Advertencias
- `INFO`: Información general
- `DEBUG`: Información detallada (solo en desarrollo)

Controlado por la variable `LOG_LEVEL`.

