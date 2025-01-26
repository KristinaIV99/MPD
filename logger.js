// logger.js
export default class Logger {
  constructor(name, config = {}) {
    this.name = name;
    
    this.config = {
      colors: {
        log: '#2196F3',
        warn: '#FF9800',
        error: '#F44336'
      },
      saveLevels: ['error'],
      maxStoredErrors: 100,
      bufferSize: 10,
      ...config
    };

    this.errorBuffer = [];
  }

  // Visi metodai iš antros klasės versijos
  log(message, ...args) {
    this._print('log', message, args);
  }

  warn(message, ...args) {
    this._print('warn', message, args);
  }

  error(message, ...args) {
    const stack = new Error().stack.split('\n').slice(2).join('\n');
    this._print('error', `${message}\nStack: ${stack}`, args);
  }

  _print(level, message, args) {
    const timestamp = new Date().toISOString();
    const safeMessage = this._sanitize(message);
    
    console[level](
      `%c[${timestamp}] [${this.name}] ${safeMessage}`,
      `color: ${this.config.colors[level]}; font-weight: bold`,
      ...args
    );

    this._saveError(level, safeMessage);
  }

  _sanitize(text) {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _saveError(level, message) {
    if (!this.config.saveLevels.includes(level)) return;

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      name: this.name,
      level
    };

    try {
      this.errorBuffer.push(errorEntry);
      if (this.errorBuffer.length >= this.config.bufferSize) {
        this._flushErrors();
      }
    } catch (e) {
      console.error('Error buffering:', e);
    }
  }

  _flushErrors() {
    try {
      const existing = JSON.parse(localStorage.getItem('app_errors') || '[]');
      const updated = existing.concat(this.errorBuffer)
        .slice(-this.config.maxStoredErrors);
      localStorage.setItem('app_errors', JSON.stringify(updated));
      this.errorBuffer = [];
    } catch (e) {
      console.error('Error saving logs:', e);
    }
  }

  getStoredErrors() {
    try {
      const stored = JSON.parse(localStorage.getItem('app_errors') || '[]');
      return stored.concat(this.errorBuffer);
    } catch (e) {
      console.error('Failed to get errors:', e);
      return [];
    }
  }

  clearStoredErrors() {
    try {
      localStorage.removeItem('app_errors');
      this.errorBuffer = [];
    } catch (e) {
      console.error('Failed to clear errors:', e);
    }
  }
}

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info'
};
