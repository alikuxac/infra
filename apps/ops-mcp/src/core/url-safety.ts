const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
  '.in-addr.arpa',
  '.test',
  '.invalid',
  '.example',
];

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function isBlockedIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (octets.some(o => Number.isNaN(o) || o > 255)) return false;

  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isIPv6Literal(host: string): boolean {
  return host.startsWith('[') || /^[0-9a-f:]+$/i.test(host) && host.includes(':');
}

function isBlockedIPv6(host: string): boolean {
  const inner = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (!inner.includes(':')) return false;

  const firstHextet = inner.split(':')[0];

  return (
    inner === '::' ||
    inner === '::1' ||
    inner.startsWith('::ffff:') ||
    /^f[cd][0-9a-f]{0,2}$/.test(firstHextet) ||
    /^fe[89ab][0-9a-f]$/.test(firstHextet)
  );
}

export interface UrlSafetyResult {
  ok: boolean;
  url?: URL;
  reason?: string;
}

export function assertPublicHttpUrl(input: string): UrlSafetyResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'Not a valid absolute URL' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: `Protocol ${url.protocol} is not allowed` };
  }

  if (url.username || url.password) {
    return { ok: false, reason: 'Credentials in the URL are not allowed' };
  }

  const host = url.hostname.toLowerCase().replace(/\.+$/, '');

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: 'Host is not routable from the public internet' };
  }

  if (BLOCKED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) {
    return { ok: false, reason: 'Host is not a public DNS name' };
  }

  if (isIPv6Literal(host)) {
    if (isBlockedIPv6(host)) {
      return { ok: false, reason: 'IPv6 address is private or loopback' };
    }
  } else if (/^[0-9.]+$/.test(host)) {
    if (isBlockedIPv4(host)) {
      return { ok: false, reason: 'IPv4 address is private, loopback or link-local' };
    }
  }

  return { ok: true, url };
}

export function assertPublicDomain(input: string): UrlSafetyResult {
  const candidate = input.trim().replace(/^https?:\/\//i, '').split('/')[0];
  if (candidate === '') {
    return { ok: false, reason: 'Domain is empty' };
  }

  if (/^[0-9.]+$/.test(candidate) || candidate.startsWith('[')) {
    return { ok: false, reason: 'IP literals are not accepted; use a hostname' };
  }

  if (!candidate.includes('.')) {
    return { ok: false, reason: 'Single-label hostnames are not allowed' };
  }

  if (!/^[a-z0-9.-]+$/i.test(candidate)) {
    return { ok: false, reason: 'Domain contains characters that are not allowed' };
  }

  return assertPublicHttpUrl(`https://${candidate}`);
}