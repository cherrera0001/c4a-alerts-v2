async function loadHealthStatus() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        const configContent = document.getElementById('configContent');
        configContent.innerHTML = `
            <div class="config-item">
                <span class="config-label">Puerto:</span>
                <span class="config-value">${data.config.server.port}</span>
            </div>
            <div class="config-item">
                <span class="config-label">Entorno:</span>
                <span class="config-value">${data.config.server.nodeEnv}</span>
            </div>
            <div class="config-item">
                <span class="config-label">Firebase:</span>
                <span class="config-value">${data.config.firebase.configured ? '<span class="badge badge-success">Configurado</span>' : '<span class="badge badge-warning">No configurado</span>'}</span>
            </div>
            <div class="config-item">
                <span class="config-label">SMTP:</span>
                <span class="config-value">${data.config.smtp.configured ? '<span class="badge badge-success">Configurado</span>' : '<span class="badge badge-warning">No configurado</span>'}</span>
            </div>
            <div class="config-item">
                <span class="config-label">Twilio:</span>
                <span class="config-value">${data.config.twilio.configured ? '<span class="badge badge-success">Configurado</span>' : '<span class="badge badge-warning">No configurado</span>'}</span>
            </div>
            <div class="config-item">
                <span class="config-label">Telegram:</span>
                <span class="config-value">${data.config.telegram.configured ? '<span class="badge badge-success">Configurado</span>' : '<span class="badge badge-warning">No configurado</span>'}</span>
            </div>
            <div class="config-item">
                <span class="config-label">Uptime:</span>
                <span class="config-value">${Math.floor(data.uptime / 60)}m ${data.uptime % 60}s</span>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando estado:', error);
        document.getElementById('configContent').innerHTML = `
            <div style="color: #dc2626; padding: 10px;">
                Error al cargar la configuración: ${error.message}
            </div>
        `;
    }
}

loadHealthStatus();
setInterval(loadHealthStatus, 5000);



