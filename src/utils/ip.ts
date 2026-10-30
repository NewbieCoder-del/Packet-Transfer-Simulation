let hostCounter = 1;

export function generateIp(subnet: string = '192.168.1'): string {
  hostCounter++;
  return `${subnet}.${hostCounter}`;
}

export function isSameSubnet(ip1: string, ip2: string, mask: string = '255.255.255.0'): boolean {
  const toNum = (s: string) => s.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const maskNum = toNum(mask);
  return (toNum(ip1) & maskNum) === (toNum(ip2) & maskNum);
}
