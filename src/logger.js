export const LOG_LEVELS = {
  LOG: 'log',
  WARN: 'warn',
  ERROR: 'error'
};

export class Logger {
  constructor(name, config = {}) {
    this.name = name;
    
    // 1. Konfigūruojami nustatymai (naujas funkcionalumas)
    this.config = {
      colors: {
        log: '#2196F3',
        warn: '#FF9800',
        error: '#F44336'
      },
      saveLevels: ['error'], // kurie lygiai išsaugomi
      maxStoredErrors: 100,
      bufferSize: 10, // kiek klaidų sukaupti prieš įrašant į localStorage
      ...config // leidžia perrašyti default nustatymus
    };

    // 2. Klaidų buferis optimizavimui (naujas funkcionalumas)
    this.errorBuffer = [];
  }

  log(message, ...args) {
    this._print('log', message, args);
  }

  warn(message, ...args) {
    this._print('warn', message, args);
  }

  error(message, ...args) {
    // 3. Stack trace gavimas (patobulinimas)
    const stack = new Error().stack.split('\n').slice(2).join('\n');
    this._print('error', `${message}\nStack: ${stack}`, args);
  }

  _print(level, message, args) {
    const timestamp = new Date().toISOString();
    
    // 4. XSS apsauga (saugumo pataisymas)
    const safeMessage = this._sanitize(message);
    
    console[level](
      `%c[${timestamp}] [${this.name}] ${safeMessage}`,
      `color: ${this.config.colors[level]}; font-weight: bold`,
      ...args
    );

    this._saveError(level, safeMessage);
  }

  // 5. Naujas metodas HTML sanitizacijai (saugumo pataisymas)
  _sanitize(text) {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _saveError(level, message) {
    // 6. Tikrinama ar lygis turi būti išsaugotas (patobulinimas)
    if (!this.config.saveLevels.includes(level)) return;

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      name: this.name,
      level // 7. Įtrauktas lygis į įrašą (patobulinimas)
    };

    try {
      // 8. Buferinimas - mažinam localStorage kvietimus (optimizavimas)
      this.errorBuffer.push(errorEntry);
      
      if (this.errorBuffer.length >= this.config.bufferSize) {
        this._flushErrors();
      }
    } catch (e) {
      console.error('Error buffering:', e);
    }
  }

  // 9. Naujas buferio flush metodas (optimizavimas)
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
      // 10. Gauti visus įrašus su buferio turiniu (patobulinimas)
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
      this.errorBuffer = []; // 11. Išvalomas ir buferis (patobulinimas)
    } catch (e) {
      console.error('Failed to clear errors:', e);
    }
  }
}
