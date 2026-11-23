import { writeFile } from 'node:fs/promises';
import { validateServiceUrl } from '../src/ai/sharedClient.js';

try {
  if (process.argv.length !== 3) throw new Error('Usage: npm run configure:server -- https://YOUR-SERVICE.onrender.com');
  const url = validateServiceUrl(process.argv[2]);
  if (!url.startsWith('https://')) throw new Error('Use the public HTTPS URL for the packaged default.');
  const host = new URL(url).hostname;
  if (/^(?:your-service|your-app|your-backend|your-domain|example)(?:\.|$)/i.test(host)
    || host === 'example.com' || host.endsWith('.example.com') || host.endsWith('.example')) {
    console.error('This is a placeholder URL. Deploy the backend first, then copy its actual HTTPS URL from Render.');
    process.exit(1);
  }
  await writeFile(new URL('../src/ai/serviceConfig.js', import.meta.url),
    '// Public service URL only. Never store credentials here.\nexport const DEFAULT_SERVICE_URL = ' + JSON.stringify(url) + ';\n');
  console.log('Shared service URL saved. Rebuild the npm package to distribute this default.');
} catch { console.error('Provide one valid public HTTPS origin with no path, query, or credentials.'); process.exitCode = 1; }
