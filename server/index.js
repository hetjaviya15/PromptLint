import { createSharedServer } from './app.js';

try {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = createSharedServer({ apiKey: process.env.GROQ_API_KEY,
    perMinute: Number(process.env.REQUESTS_PER_MINUTE ?? 10),
    perDay: Number(process.env.REQUESTS_PER_DAY ?? 100),
    maxConcurrent: Number(process.env.MAX_CONCURRENT ?? 2) });
  server.on('error', () => { console.error('Unable to start the server. Check port availability.'); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => console.log(`PromptLint shared service listening on port ${port}.`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 35000).unref();
  });
} catch (error) { console.error(error.message); process.exitCode = 1; }
