ABSOLUTE REGELN (STENG!)
text
1. MOBILE FIRST (immer zuerst Mobile, dann Desktop)
2. MINIMALISTISCH (kein Pixel Müll, nur Essentials)
3. SICHERHEIT ÜBER ALLES (nie Keys in Code, immer WalletConnect)
4. PERFORMANCE (95+ Lighthouse, <100kb Bundle)
5. TYPE-SCRIPT (100% Typen, keine any{})
6. DARK MODE ONLY (moderne Crypto-Ästhetik)

DESIGN SYSTEM (Kopiere immer!)
text
Farben:
--bg: #0a0a0a
--bg2: #111111  
--accent: #00d4aa (XMR Grün)
--text: #f0f0f0
--glass: rgba(255,255,255,0.05)

Typography:
font-family: 'Inter', sans-serif
font-sizes: 14px base, 18px h3, 24px h2, 32px h1

Spacing: 8px, 16px, 24px, 32px (multiples)
Border-radius: 12px überall
Shadows: glassmorphism (backdrop-blur)

📁 GENAU DIESE STRUKTUR (keine Abweichungen!)
text
private-xmr-swap/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx           # Dashboard
│   ├── api/
│   │   ├── swap/route.ts
│   │   └── wallets/route.ts
├── lib/
│   ├── wallets.ts        # 5 Wallet Manager
│   ├── swaps.ts          # Beste Routen
│   └── utils.ts          # Helpers
├── components/
│   ├── ui/               # shadcn/ui Komponenten
│   ├── SwapCard.tsx
│   ├── WalletGrid.tsx
│   └── PaymentForm.tsx
├── types.ts
└── README.md


⚡ PERFORMANCE ZIELWERTE (muss erreichen!)
text
Lighthouse Mobile: 95+ Performance
Core Web Vitals: LCP <1.5s, FID <100ms, CLS <0.1
Bundle: <100kb gzipped
TTFB: <200ms
Images: AVIF/WebP, <50kb

🔒 SICHERHEIT (niemals vergessen!)
text
✅ NIE Private Keys im Code/State
✅ WalletConnect v2.0 nur
✅ Server Actions (keine Client RPC)
✅ Input Validation (Zod Schemas)
✅ Rate Limiting (5 req/min)
✅ CSP Headers (Next.js config)
✅ No Logs von Balances/Addresses

📱 MOBILE FIRST WORKFLOW
text
1. Zuerst Mobile Styles schreiben (320px)
2. Dann Tablet (768px)  
3. Dann Desktop (1200px+)
4. Immer Tailwind responsive classes
5. Touch Targets: min 48x48px