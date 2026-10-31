let hostCounter = 1;

export function generateIp(subnet: string = '192.168.1'): string {
  hostCounter++;
  return `${subnet}.${hostCounter}`;
}

const OCTETS = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** Dotted-quad IPv4 address. */
export function isValidIpv4(value: string): boolean {
  return OCTETS.test(value);
}

/** Dotted-quad subnet mask whose leading bits are contiguous, e.g. 255.255.255.0 but not 255.0.255.0. */
export function isValidSubnetMask(value: string): boolean {
  if (!OCTETS.test(value)) return false;
  const bits = value.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  if (bits === 0) return false;
  const hostBits = ~bits;
  return (hostBits & (hostBits + 1)) === 0;
}

/** Prefix length for a dotted-quad mask, so the routing table reads like a real one. */
export function maskToPrefix(value: string): number {
  if (!isValidSubnetMask(value)) return 0;
  const bits = value.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  let count = 0;
  for (let i = 0; i < 32; i++) if ((bits >>> i) & 1) count++;
  return count;
}

export function isSameSubnet(ip1: string, ip2: string, mask: string = '255.255.255.0'): boolean {
  const toNum = (s: string) => s.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const maskNum = toNum(mask);
  return (toNum(ip1) & maskNum) === (toNum(ip2) & maskNum);
}
