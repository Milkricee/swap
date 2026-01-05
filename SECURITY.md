# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Features

### Implemented
- ✅ **User-Password Encryption**: PBKDF2 with 100k iterations
- ✅ **Session Management**: Auto-lock after 30 minutes
- ✅ **Rate Limiting**: All API routes protected (3-20 req/min)
- ✅ **CSP Headers**: Strict Content Security Policy
- ✅ **Input Validation**: Zod schemas on all user inputs
- ✅ **Encrypted Storage**: AES-256 encryption for localStorage
- ✅ **No Server-Side Keys**: All encryption happens client-side

### Privacy Features
- 🔒 **No KYC**: No registration or identity verification
- 🔒 **No Database**: All data stored locally (encrypted)
- 🔒 **No Telemetry**: No tracking or analytics
- 🔒 **5-Wallet System**: Enhanced transaction privacy

## Reporting a Vulnerability

**DO NOT** open a public issue for security vulnerabilities.

Instead:
1. Email: [Your Email] (or create private security advisory on GitHub)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

**Response Time:**
- Acknowledgment: Within 48 hours
- Initial assessment: Within 7 days
- Fix timeline: Depends on severity

## Known Limitations

### Current Risks
1. **Client-Side Encryption**: Keys stored in browser (vulnerable if device compromised)
2. **Remote Nodes**: Blockchain queries via third-party nodes (potential privacy leak)
3. **No 2FA**: Single password protection only

### Mitigation Strategies
1. Use hardware wallets for large amounts
2. Host your own Monero node for maximum privacy
3. Enable session timeout (auto-implemented)
4. Regular seed backups to offline storage

## Best Practices for Users

### Setup
- [ ] Use strong password (16+ characters)
- [ ] Write down 25-word seed on paper (never digital)
- [ ] Test recovery with small amounts first
- [ ] Use Tor Browser or VPN for enhanced privacy

### Operations
- [ ] Never share your password or seed
- [ ] Verify recipient addresses before payments
- [ ] Use fixed-rate swaps (avoid floating rates)
- [ ] Small test transactions before large amounts

### Storage
- [ ] Backup seeds in multiple physical locations
- [ ] Never store seeds in cloud storage
- [ ] Consider metal seed storage for fire resistance
- [ ] Keep backups updated after wallet changes

## Responsible Disclosure

We appreciate security researchers who:
- Report vulnerabilities privately first
- Allow reasonable time for fixes before disclosure
- Do not exploit vulnerabilities

**Recognition:**
- Public acknowledgment in CHANGELOG (if desired)
- Listed in security contributors

## Security Audits

**Status:** Not audited  
**Last Review:** January 2026  
**Next Planned:** TBD

For production use, we recommend:
1. Independent security audit
2. Penetration testing
3. Code review by cryptography experts

---

**Disclaimer:** This software is provided "as is" without warranty. Use at your own risk. Not recommended for production use without proper security audit.
