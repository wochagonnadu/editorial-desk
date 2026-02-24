// PATH: services/api/src/providers/logger.ts
// WHAT: Lightweight structured logger for API modules
// WHY:  Enforces consistent JSON logs with request context
// RELEVANT: services/api/src/app.ts,services/api/src/routes/index.ts

export interface LogContext {
  request_id?: string;
  company_id?: string;
  actor?: string;
  [key: string]: unknown;
}

export interface Logger {
  child(context: LogContext): Logger;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const write = (level: string, message: string, context: LogContext): void => {
  const entry = { level, message, time: new Date().toISOString(), ...context };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
};

export const createLogger = (baseContext: LogContext = {}): Logger => ({
  child(extra) {
    return createLogger({ ...baseContext, ...extra });
  },
  info(message, context = {}) {
    write('info', message, { ...baseContext, ...context });
  },
  warn(message, context = {}) {
    write('warn', message, { ...baseContext, ...context });
  },
  error(message, context = {}) {
    write('error', message, { ...baseContext, ...context });
  },
});
