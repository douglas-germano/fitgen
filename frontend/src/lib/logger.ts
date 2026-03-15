/**
 * Logger utility for development-only logging
 *
 * In production, logs are suppressed to avoid console pollution.
 * In development, logs are shown with context for debugging.
 */

const isDevelopment = process.env.NODE_ENV === "development";

type LogLevel = "log" | "info" | "warn" | "error" | "debug";

interface LoggerOptions {
    prefix?: string;
    forceInProduction?: boolean;
}

function createLogMethod(level: LogLevel) {
    return (message: string, ...args: unknown[]) => {
        if (isDevelopment) {
            console[level](message, ...args);
        }
    };
}

export const logger = {
    log: createLogMethod("log"),
    info: createLogMethod("info"),
    warn: createLogMethod("warn"),
    debug: createLogMethod("debug"),
    // Errors are always logged (important for debugging production issues)
    error: (message: string, ...args: unknown[]) => {
        console.error(message, ...args);
    },
};

/**
 * Create a prefixed logger for a specific module
 */
export function createLogger(prefix: string, options: LoggerOptions = {}) {
    const formatMessage = (msg: string) => `[${prefix}] ${msg}`;

    return {
        log: (message: string, ...args: unknown[]) => {
            if (isDevelopment || options.forceInProduction) {
                console.log(formatMessage(message), ...args);
            }
        },
        info: (message: string, ...args: unknown[]) => {
            if (isDevelopment || options.forceInProduction) {
                console.info(formatMessage(message), ...args);
            }
        },
        warn: (message: string, ...args: unknown[]) => {
            if (isDevelopment || options.forceInProduction) {
                console.warn(formatMessage(message), ...args);
            }
        },
        debug: (message: string, ...args: unknown[]) => {
            if (isDevelopment) {
                console.debug(formatMessage(message), ...args);
            }
        },
        error: (message: string, ...args: unknown[]) => {
            // Errors are always logged
            console.error(formatMessage(message), ...args);
        },
    };
}

export default logger;
