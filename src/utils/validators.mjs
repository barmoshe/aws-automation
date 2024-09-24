import net from 'net';
import { ValidationError } from './awsHelpers.mjs';

export function isValidCIDR(cidr) {
  try {
    const [ip, prefix] = cidr.split("/");
    if (!prefix || isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    return net.isIP(ip) !== 0;
  } catch (error) {
    return false;
  }
}
