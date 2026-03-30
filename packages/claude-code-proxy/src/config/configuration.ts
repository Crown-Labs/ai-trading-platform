export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/claude_proxy',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  },
  adminSecret: process.env.ADMIN_SECRET || '',
});
