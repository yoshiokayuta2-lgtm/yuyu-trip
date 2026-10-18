import { loadEnv } from 'vite';
const env={...loadEnv('production',process.cwd(),''),...process.env};
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)||url.includes('YOUR_PROJECT'))throw Error('Set VITE_SUPABASE_URL in .env.local or GitHub Actions repository Variables.');
if(!key||key.includes('REPLACE_ME')||key.startsWith('sb_secret_'))throw Error('Set a Supabase publishable key (never a secret/service_role key).');
if(key.startsWith('eyJ')){let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString())}catch{}if(payload?.role!=='anon')throw Error('Only the legacy anon key or the new publishable key may be bundled.');}
else if(!key.startsWith('sb_publishable_'))throw Error('Expected a Supabase publishable key.');
