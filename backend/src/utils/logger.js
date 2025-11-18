const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "INFO" : "DEBUG");

function shouldLog(level) {
  return logLevels[level] <= logLevels[currentLevel];
}

export const logger = {
  error: (message, meta = {}) => {
    if (shouldLog("ERROR")) {
      console.error(JSON.stringify({
        level: "ERROR",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog("WARN")) {
      console.warn(JSON.stringify({
        level: "WARN",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog("INFO")) {
      console.log(JSON.stringify({
        level: "INFO",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog("DEBUG")) {
      console.log(JSON.stringify({
        level: "DEBUG",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
};

