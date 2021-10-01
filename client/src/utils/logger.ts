import winston from 'winston';

const format = winston.format.combine(winston.format.json(),
winston.format.timestamp())

export const logger = winston.createLogger({
  level: 'info',
  format: format,
  defaultMeta: { service: 'org1-app' },
  transports: [
    new winston.transports.Console({format:winston.format.simple()}),
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' ,format:format}),
    new winston.transports.File({ filename: 'combined.log' ,format:format}),
  ],
});

