export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'webrtc_conf',
    user: process.env.DB_USER ?? 'webrtc',
    pass: process.env.DB_PASS ?? 'password',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access_secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh_secret',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  turn: {
    stun: process.env.STUN_SERVER_URL ?? 'stun:stun.l.google.com:19302',
    url: process.env.TURN_SERVER_URL ?? '',
    secret: process.env.TURN_SECRET ?? '',
  },
});
