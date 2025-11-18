# C4A Alerts v2 - Sistema de Gestión de Alertas de Seguridad

C4A Alerts v2 es un sistema completo y moderno para la gestión, análisis y enriquecimiento de alertas de seguridad cibernética. Desarrollado con arquitectura de microservicios, integra capacidades de inteligencia artificial y pipelines de Cyber Threat Intelligence (CTI) para proporcionar una plataforma robusta de gestión de amenazas.

## Nuevas Capacidades v2.0

### 🎯 CTI Real (Cyber Threat Intelligence)
- **Integración MISP**: Ingestión automática de eventos desde MISP
- **Integración NVD**: Obtención de CVEs recientes desde National Vulnerability Database
- **Feeds RSS**: Parser automático para feeds de seguridad (CISA, Microsoft, Google, etc.)
- **Pipeline Unificado**: Orquestación automática de múltiples fuentes CTI
- **Correlación Automática**: Asociación inteligente entre amenazas y activos

### 🤖 Motor de IA con Agentes
- **EnricherAgent**: Enriquece items CTI con resúmenes, mapeo MITRE ATT&CK y clasificación
- **TriageAgent**: Evalúa relevancia de amenazas y genera alertas automáticamente
- **ReporterAgent**: Genera reportes ejecutivos y técnicos usando IA
- **IngestorAgent**: Orquesta la ingestión automática de feeds CTI

### 🧠 RAG (Retrieval-Augmented Generation)
- **Búsqueda Semántica**: Búsqueda de amenazas similares usando embeddings
- **Correlación Histórica**: Asocia amenazas actuales con amenazas históricas
- **Base de Conocimiento**: Almacenamiento de conocimiento CTI para enriquecer respuestas de IA

### 🔒 Seguridad Endurecida
- **Firestore Security Rules**: Aislamiento por organización y roles
- **CSP Restrictivo**: Content Security Policy endurecido contra XSS
- **CORS Estricto**: Whitelist de orígenes permitidos en producción
- **Sanitización Robusta**: Protección contra inyección y XSS avanzados

## Estructura del Proyecto

```
.
├── backend/          # API REST con Express
│   ├── src/
│   │   ├── config/   # Configuración (Firebase, CORS, seguridad)
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── schemas/  # Validación con Zod
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
└── frontend/         # Aplicación React con Vite
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── services/
    │   └── styles/
    └── package.json
```

## Instalación y Configuración

### Backend

1. Navegar al directorio backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:

Crea un archivo `.env` en el directorio `backend/` con las siguientes variables:

```env
# Puerto del servidor
PORT=3001

# JWT - Usa una clave secreta fuerte en producción
JWT_SECRET=CHANGE_ME_NOW_USE_A_STRONG_SECRET_IN_PRODUCTION

# CORS - Orígenes permitidos (separados por coma)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com

# SMTP para notificaciones por email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@c4a-alerts.com

# Twilio para WhatsApp (opcional)
TWILIO_ACCOUNT_SID=tu-account-sid
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=tu-bot-token
TELEGRAM_CHAT_ID=tu-chat-id

# CTI Integration (opcional)
MISP_BASE_URL=https://misp.example.com
MISP_API_KEY=tu_misp_api_key
NVD_API_KEY=tu_nvd_api_key  # Opcional pero recomendado

# IA Integration (opcional)
# OpenAI
IA_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# O Azure OpenAI
# IA_PROVIDER=azure
# AZURE_OPENAI_API_KEY=...
# AZURE_OPENAI_ENDPOINT=https://...
# AZURE_OPENAI_DEPLOYMENT=gpt-4
# AZURE_OPENAI_API_VERSION=2024-02-15-preview

# O Google AI Studio (Gemini)
# IA_PROVIDER=gemini
# GOOGLE_AI_API_KEY=AIzaSy...
# GEMINI_MODEL=gemini-2.0-flash
# GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Entorno y logging
NODE_ENV=development
LOG_LEVEL=DEBUG
```

**Importante:**
- Reemplaza `JWT_SECRET` con una cadena aleatoria segura (mínimo 32 caracteres)
- Configura las credenciales de Firebase Admin SDK desde la consola de Firebase
- Las notificaciones por email, WhatsApp y Telegram son opcionales
- **CTI Integration**: Configura `MISP_BASE_URL` y `MISP_API_KEY` para habilitar ingestión automática desde MISP
- **NVD Integration**: `NVD_API_KEY` es opcional pero recomendado para evitar rate limits
- **IA Integration**: Configura OpenAI, Azure OpenAI o Google AI Studio (Gemini) para habilitar capacidades de IA (enriquecimiento, triage, reportes)

4. Iniciar el servidor:
```bash
npm start
```

Para desarrollo con hot-reload:
```bash
npm run dev
```

**Scripts disponibles:**
- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con watch mode
- `npm run lint` - Ejecuta ESLint para verificar la calidad del código
- `npm test` - Ejecuta los tests (incluye smoke tests)

### Frontend

1. Navegar al directorio frontend:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (opcional):

Crea un archivo `.env` en el directorio `frontend/` si necesitas configurar la URL de la API:

```env
# URL del backend API
VITE_API_URL=http://localhost:3001
```

Por defecto, el frontend intentará conectarse a `http://localhost:3001`.

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

El servidor de desarrollo se iniciará en `http://localhost:5173` (o el siguiente puerto disponible).

**Scripts disponibles:**
- `npm run dev` - Inicia el servidor de desarrollo con Vite
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta ESLint para verificar la calidad del código
- `npm test` - Ejecuta los tests (incluye smoke tests)

## Comandos de Inicio Rápido

### Backend
```bash
cd backend
npm install
# Configurar .env con tus credenciales
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## CI/CD y Desarrollo

El proyecto incluye workflows de GitHub Actions para asegurar la calidad del código:

### GitHub Actions

**Frontend CI** (`.github/workflows/frontend.yml`):
- Se ejecuta en push/PR cuando hay cambios en `frontend/`
- Instala dependencias con `npm ci`
- Ejecuta linting con `npm run lint`
- Ejecuta build con `npm run build`
- Ejecuta tests con `npm test`

**Backend CI** (`.github/workflows/backend.yml`):
- Se ejecuta en push/PR cuando hay cambios en `backend/`
- Instala dependencias con `npm ci`
- Ejecuta linting con `npm run lint`
- Ejecuta tests con `npm test`

### Scripts de Desarrollo

**Backend:**
- `npm run lint` - Verifica el código con ESLint
- `npm test` - Ejecuta tests (smoke tests incluidos)

**Frontend:**
- `npm run lint` - Verifica el código con ESLint
- `npm test` - Ejecuta smoke tests

## Stack Tecnológico

### Backend

**Runtime y Framework:**
- Node.js 20+
- Express.js 4.18+

**Base de Datos:**
- Firebase Firestore (NoSQL)

**Autenticación y Seguridad:**
- JWT (JSON Web Tokens) para autenticación
- bcrypt para hashing de contraseñas (12 rounds)
- Helmet para headers de seguridad HTTP
- CORS configurado
- Rate limiting con express-rate-limit
- DOMPurify (isomorphic-dompurify) para sanitización

**Validación:**
- Zod para validación de esquemas y tipos

**Comunicación:**
- Axios para peticiones HTTP
- Nodemailer para notificaciones por email
- Integración con Telegram (opcional)
- Integración con Twilio WhatsApp (opcional)

**Desarrollo y Calidad:**
- ESLint para linting
- Node.js test runner para testing

**Estructura del Backend:**
- **config/**: Configuración de Firebase, CORS, seguridad (Helmet)
- **controllers/**: Controladores de rutas HTTP
- **services/**: Lógica de negocio y acceso a datos (alerts, auth, assets, CTI, notifications)
- **middlewares/**: Autenticación, autorización, validación, sanitización, rate limiting, manejo de errores
- **routes/**: Definición de endpoints (alerts, auth, assets, CTI, health)
- **schemas/**: Schemas de validación con Zod
- **utils/**: Utilidades (JWT, logger, respuestas HTTP)

### Frontend

**Framework y Librerías:**
- React 18.2+
- React Router DOM 6.21+ para navegación
- React Hot Toast 2.4+ para notificaciones
- date-fns 2.30+ para manejo de fechas
- clsx y tailwind-merge para gestión de clases CSS

**Build Tool:**
- Vite 5.0+ para desarrollo rápido y builds optimizados

**Estilos:**
- Tailwind CSS 3.3+ para diseño utilitario
- PostCSS y Autoprefixer

**Calidad de Código:**
- ESLint con plugins de React
- Node.js test runner para testing

**Estructura del Frontend:**
- **components/**: Componentes reutilizables de UI
- **context/**: Context API para estado global (AuthContext)
- **hooks/**: Custom hooks para lógica reutilizable
- **pages/**: Páginas principales (Login, Dashboard, Alerts, Assets, CTI)
- **services/**: Clientes API y servicios de comunicación
- **styles/**: Estilos globales y configuración CSS
- **test/**: Tests de smoke y unitarios

## Endpoints de la API

### Autenticación (`/api/auth`)

- `POST /api/auth/login` - Iniciar sesión
  - Body: `{ email, password }`
  - Response: `{ user, token }`

- `POST /api/auth/register` - Registrar nuevo usuario
  - Body: `{ email, password, name }`
  - Response: `{ user, token }`

- `GET /api/auth/me` - Obtener perfil del usuario autenticado
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ id, email, name, ... }`

- `PATCH /api/auth/profile` - Actualizar perfil
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ name?, email? }`
  - Response: `{ id, email, name, ... }`

- `POST /api/auth/change-password` - Cambiar contraseña
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ currentPassword, newPassword }`
  - Response: `204 No Content`

### Alertas (`/api/alerts`)

- `GET /api/alerts` - Listar alertas (con paginación y filtros)
  - Headers: `Authorization: Bearer <token>`
  - Query params: `limit`, `startAfter`, `severity`, `status`, `orderBy`, `orderDirection`
  - Response: `{ alerts: [], pagination: {} }`

- `GET /api/alerts/stats` - Obtener estadísticas
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ total, bySeverity: {}, byStatus: {} }`

- `GET /api/alerts/:id` - Obtener alerta por ID
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ id, title, description, severity, status, ... }`

- `POST /api/alerts` - Crear nueva alerta
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ title, description?, severity?, status?, cvss_score?, epss_score?, tags?, cve_ids?, url?, metadata? }`
  - Response: `{ id, title, ... }`

- `PUT /api/alerts/:id` - Actualizar alerta
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ title?, description?, severity?, status?, ... }`
  - Response: `{ id, title, ... }`

- `DELETE /api/alerts/:id` - Eliminar alerta
  - Headers: `Authorization: Bearer <token>`
  - Response: `204 No Content`

### Health Check

- `GET /health` - Verificar estado del servidor
  - Response: `{ status: "ok", timestamp: "..." }`

## Vistas Frontend

### Login (`/login`)
- Formulario de inicio de sesión
- Campos: email y contraseña
- Validación en cliente
- Redirección a dashboard tras login exitoso

### Dashboard (`/dashboard`)
- Vista principal protegida
- Estadísticas de alertas (total, por severidad)
- Tabla de alertas con filtros:
  - Filtro por severidad (critical, high, medium, low, info)
  - Filtro por estado (pending, processing, completed, failed, archived)
- Información de usuario y botón de cerrar sesión
- Diseño responsive con Tailwind CSS

## Puntos de Integración para IA y Pipeline CTI

### 1. Procesamiento de Alertas con IA

**Ubicación:** `backend/src/services/alerts.service.js` - Función `createAlert`

**Integración sugerida:**
```javascript
// Después de crear la alerta, procesar con IA
import { processAlertWithAI } from '../services/ai.service.js';

export async function createAlert(userId, data) {
  // ... código existente ...
  
  // Punto de integración IA
  const aiAnalysis = await processAlertWithAI(alertWithId);
  // Actualizar alerta con análisis de IA
  await updateAlertMetadata(alertWithId.id, { aiAnalysis });
  
  return alertWithId;
}
```

**Servicio sugerido:** `backend/src/services/ai.service.js`
- Análisis de texto con NLP
- Clasificación automática de severidad
- Extracción de entidades (IPs, dominios, CVEs)
- Generación de recomendaciones

### 2. Pipeline CTI (Cyber Threat Intelligence)

**Ubicación:** `backend/src/services/alerts.service.js` - Función `createAlert`

**Integración sugerida:**
```javascript
// Después de crear la alerta, enriquecer con CTI
import { enrichWithCTI } from '../services/cti.service.js';

export async function createAlert(userId, data) {
  // ... código existente ...
  
  // Punto de integración CTI
  const ctiData = await enrichWithCTI({
    cve_ids: alertWithId.cve_ids,
    url: alertWithId.url,
    metadata: alertWithId.metadata
  });
  
  // Actualizar alerta con datos CTI
  await updateAlertMetadata(alertWithId.id, { 
    cti: {
      cvss: ctiData.cvss,
      epss: ctiData.epss,
      threatActors: ctiData.threatActors,
      iocs: ctiData.iocs
    }
  });
  
  return alertWithId;
}
```

**Servicio sugerido:** `backend/src/services/cti.service.js`
- Integración con APIs de CTI (MISP, AlienVault, VirusTotal)
- Enriquecimiento automático de CVEs
- Análisis de IOCs (Indicators of Compromise)
- Correlación con threat feeds

### 3. Webhook para Procesamiento Asíncrono

**Ubicación:** `backend/src/routes/alerts.routes.js`

**Nueva ruta sugerida:**
```javascript
// POST /api/alerts/webhook
// Para recibir alertas de sistemas externos y procesarlas con IA/CTI
router.post('/webhook', webhookAuth, async (req, res) => {
  const alert = await createAlert(req.body.userId, req.body);
  
  // Procesar en background con IA y CTI
  processAlertAsync(alert.id);
  
  res.status(201).json({ alert });
});
```

### 4. Endpoint de Análisis con IA

**Nueva ruta sugerida:** `backend/src/routes/ai.routes.js`
```javascript
// POST /api/ai/analyze
// Analizar texto de alerta con IA
router.post('/analyze', authRequired, async (req, res) => {
  const { text } = req.body;
  const analysis = await analyzeWithAI(text);
  res.json(analysis);
});
```

### 5. Dashboard de Análisis CTI

**Nueva vista sugerida:** `frontend/src/pages/CTIAnalysis.jsx`
- Visualización de threat intelligence
- Gráficos de correlación de amenazas
- Timeline de eventos
- Mapa de amenazas

### 6. Integración con Agentes de IA

**Ubicación:** `backend/src/services/ai-agents.service.js` (nuevo)

**Funcionalidades sugeridas:**
- Agente de análisis de alertas
- Agente de generación de recomendaciones
- Agente de correlación de eventos
- Agente de respuesta automática

**Ejemplo de integración:**
```javascript
import { AlertAnalysisAgent } from './ai-agents/alert-analysis.js';
import { RecommendationAgent } from './ai-agents/recommendations.js';

export async function processAlertWithAgents(alert) {
  const analysisAgent = new AlertAnalysisAgent();
  const recommendationAgent = new RecommendationAgent();
  
  const analysis = await analysisAgent.analyze(alert);
  const recommendations = await recommendationAgent.generate(alert, analysis);
  
  return { analysis, recommendations };
}
```

## Seguridad

C4A Alerts v2 implementa múltiples capas de seguridad:

**Autenticación y Autorización:**
- Autenticación basada en JWT (JSON Web Tokens)
- Contraseñas hasheadas con bcrypt (12 rounds)
- Middleware de autorización para proteger rutas sensibles

**Validación y Sanitización:**
- Validación de entrada con Zod (schemas estrictos)
- Sanitización de datos con DOMPurify (isomorphic-dompurify)
- Validación de tipos en tiempo de ejecución

**Protección HTTP:**
- Helmet para configurar headers de seguridad HTTP
- CORS configurado con orígenes permitidos
- Rate limiting para prevenir abuso y ataques DDoS
- Protección contra inyección de código y XSS

**Desarrollo Seguro:**
- ESLint para detectar problemas de seguridad en el código
- Tests de smoke para verificar que los módulos críticos cargan correctamente
- CI/CD automatizado para validar cambios antes de merge

## Próximos Pasos

1. **Integración de IA:**
   - Implementar servicios de análisis con IA
   - Agregar endpoints para procesamiento de alertas
   - Dashboard de análisis inteligente

2. **Pipeline CTI:**
   - Integración con fuentes de threat intelligence
   - Enriquecimiento automático de alertas
   - Correlación de eventos

3. **Mejoras de Frontend:**
   - Vista detallada de alertas
   - Gráficos y visualizaciones
   - Filtros avanzados
   - Exportación de datos

4. **Testing:**
   - Tests unitarios
   - Tests de integración
   - Tests E2E

## Licencia

ISC

