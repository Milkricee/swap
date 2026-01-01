# 🚨 CRITICAL SECURITY FIXES - IMMEDIATE ACTION REQUIRED

**Stand:** 2026-01-01  
**Priority:** P0 - Deploy before Production

---

## ✅ BEREITS IMPLEMENTIERT

### 1. Security Headers (DONE)
```javascript
// next.config.mjs - headers() function added
✅ HSTS (Strict-Transport-Security)
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ CSP (Content-Security-Policy)
✅ Referrer-Policy
✅ Permissions-Policy
```

**Test:**
```bash
npm run build
npm start
curl -I https://localhost:3000 | grep -i "strict-transport"
```

---

## 🔴 SOFORT UMSETZEN (heute)

### 1. Encryption Key ändern
**KRITISCH:** Default Key austauschen!

```bash
# .env.local
# ALT (UNSICHER):
NEXT_PUBLIC_ENCRYPTION_KEY=default-key-change-in-production

# NEU (32 Zeichen random):
NEXT_PUBLIC_ENCRYPTION_KEY=$(openssl rand -base64 32)
# Beispiel: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2
```

**⚠️ WICHTIG:**
- Neuen Key generieren: `openssl rand -base64 32`
- NUR in `.env.local` (NICHT committen!)
- Backup vom Key machen (aber NICHT in Git!)

---

### 2. Rate Limiting auf CREATE & PAY
**Status:** Nur `/recover` hat Rate Limiting

```bash
# app/api/wallets/create/route.ts hinzufügen:
```

```typescript
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // max 5 wallet creates per hour

export async function POST(request: Request) {
  // Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter(t => now - t < 3600000); // 1 hour
  
  if (recentRequests.length >= RATE_LIMIT) {
    return Response.json(
      { error: 'Rate limit exceeded. Max 5 wallet creations per hour.' },
      { status: 429 }
    );
  }
  
  rateLimitMap.set(ip, [...recentRequests, now]);
  
  // ... rest of logic
}
```

**Action:**
- [ ] Copy Rate Limiting zu `/api/wallets/create/route.ts`
- [ ] Copy Rate Limiting zu `/api/pay/route.ts` (10 req/hour)
- [ ] Copy Rate Limiting zu `/api/swap/route.ts` (20 req/hour)

---

### 3. Console Logs entfernen
**RISIKO:** Seeds/Keys könnten in Console erscheinen

```bash
# Search & Replace:
grep -r "console.log" lib/ components/ app/
```

**Ersetzen mit:**
```typescript
// DEV only logging
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', data);
}
```

**Action:**
- [ ] Alle `console.log` mit Seeds/Keys entfernen
- [ ] Nur `console.error` für Production behalten

---

## 🟡 DIESE WOCHE

### 4. User-Password Encryption (PBKDF2)
**File:** `lib/storage/user-encryption.ts` (BEREITS ERSTELLT)

**Integration:**
```typescript
// 1. Bei Wallet-Create: User muss Password eingeben
const handleCreateWallets = async (password: string) => {
  // Generate key from password
  const { key, salt } = await deriveKeyFromPassword(password);
  storeSalt(salt);
  
  // Create wallets
  const result = await fetch('/api/wallets/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
};

// 2. Bei Wallet-Access: Password abfragen
const handleUnlock = async (password: string) => {
  const encrypted = localStorage.getItem('xmr_wallets_encrypted');
  const wallets = await decryptWithPassword(encrypted, password);
  
  if (!wallets) {
    alert('Invalid password');
    return;
  }
  
  setWallets(wallets);
};
```

**Action:**
- [ ] Password-Input in WalletView.tsx
- [ ] Password bei Create speichern (in Session, NICHT localStorage)
- [ ] Auto-Lock nach 15 Minuten Inaktivität

---

### 5. Upstash Redis Rate Limiting
**Grund:** Memory-basiertes Limiting wird bei Server-Restart zurückgesetzt

**Setup:**
```bash
# 1. Upstash Account
https://console.upstash.com/redis

# 2. Install
npm install @upstash/ratelimit @upstash/redis

# 3. .env.local
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Implementation:**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

// In API Routes:
import { ratelimit } from '@/lib/rate-limit';

const ip = request.headers.get('x-forwarded-for') || 'unknown';
const { success } = await ratelimit.limit(ip);

if (!success) {
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

**Action:**
- [ ] Upstash Redis Account erstellen
- [ ] Credentials in `.env.local`
- [ ] Rate Limiting in allen API Routes

---

## 📋 DEPLOYMENT CHECKLIST

Vor dem ersten Production-Deploy:

**Security:**
- [ ] ✅ Security Headers aktiv (bereits done)
- [ ] Unique Encryption Key gesetzt
- [ ] Rate Limiting auf ALLEN API Routes
- [ ] Console.logs entfernt
- [ ] User-Password Encryption aktiv
- [ ] HTTPS erzwungen (via Vercel/Cloudflare)

**Performance:**
- [ ] Bundle Size <100KB gzipped
- [ ] Lighthouse Mobile Score >95
- [ ] Balance Queries gecached

**Functionality:**
- [ ] Backup/Recovery getestet
- [ ] Payment Flow E2E getestet
- [ ] Swap Provider Fallbacks getestet

**Monitoring:**
- [ ] Error Tracking (Sentry) setup
- [ ] Uptime Monitoring (UptimeRobot)
- [ ] Analytics (Plausible/umami)

---

## 🆘 INCIDENT RESPONSE

### Falls Encryption Key leaked:
1. **Sofort:** Neuen Key generieren
2. **User warnen:** Email/Banner mit Anleitung
3. **Migration:** Tool zum Re-Encrypt mit neuem Key
4. **Audit:** Wie ist Key geleakt? Fix implementieren

### Falls Rate Limit umgangen wird:
1. **IP Blacklist:** Malicious IPs in Upstash blocken
2. **Cloudflare:** Bot-Protection aktivieren
3. **CAPTCHA:** Turnstile bei kritischen Actions

### Falls Seeds im Browser-Storage kompromittiert:
1. **User benachrichtigen:** Wallet-Recovery via Seeds
2. **Force Re-Encryption:** Mit User-Password
3. **Security Audit:** localStorage-Zugriff prüfen

---

## 📞 SUPPORT

Bei Fragen zu Security:
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security
- Monero Security: https://www.getmonero.org/resources/user-guides/

**Review alle 2 Wochen:**
```bash
npm audit
npm outdated
```
