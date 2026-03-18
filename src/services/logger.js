class Logger {
  constructor() {
    this.service = 'pagamentos';
    this.version = '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  // Log base estruturado
  _baseLog(level, message, metadata = {}) {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      version: this.version,
      environment: this.environment,
      message,
      ...metadata,
      // Adiciona métricas automáticas
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Em desenvolvimento, print bonitinho
    if (this.environment === 'development') {
      const icon = this._getIcon(level);
      console.log(`${icon} ${log.timestamp} [${level.toUpperCase()}] ${message}`);
      if (Object.keys(metadata).length > 0) {
        console.log('   📊 Dados:', JSON.stringify(metadata, null, 2));
      }
    } else {
      // Em produção, JSON puro para o Grafana
      console.log(JSON.stringify(log));
    }

    return log;
  }

  _getIcon(level) {
    const icons = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🐛',
      metric: '📈'
    };
    return icons[level] || '📝';
  }

  // Logs informativos
  info(message, metadata = {}) {
    return this._baseLog('info', message, metadata);
  }

  // Logs de aviso
  warn(message, metadata = {}) {
    return this._baseLog('warn', message, metadata);
  }

  // Logs de erro
  error(message, metadata = {}) {
    if (metadata.error instanceof Error) {
      metadata = {
        ...metadata,
        error_message: metadata.error.message,
        error_stack: metadata.error.stack,
        error_name: metadata.error.name
      };
      delete metadata.error;
    }
    return this._baseLog('error', message, metadata);
  }

  // Logs de debug (desligados em produção)
  debug(message, metadata = {}) {
    if (this.environment !== 'production') {
      return this._baseLog('debug', message, metadata);
    }
  }

  // Logs de métricas específicas
  metric(name, value, tags = {}) {
    return this._baseLog('metric', `metric:${name}`, {
      metric_name: name,
      metric_value: value,
      metric_tags: tags
    });
  }

  // Timer para medir performance
  timer(name) {
    const start = Date.now();
    return {
      end: (metadata = {}) => {
        const duration = Date.now() - start;
        this.metric(`${name}_duration_ms`, duration, metadata);
        return duration;
      }
    };
  }

  // Log de requisição HTTP
  httpRequest(req, res, durationMs) {
    const metadata = {
      http: {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration_ms: durationMs,
        user_agent: req.get('user-agent'),
        ip: req.ip
      },
      user: req.user ? {
        id: req.user.usuario_id,
        role: req.user.role,
        email: req.user.email
      } : null
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    return this._baseLog(level, `HTTP ${req.method} ${req.url} ${res.statusCode}`, metadata);
  }
}

module.exports = new Logger();