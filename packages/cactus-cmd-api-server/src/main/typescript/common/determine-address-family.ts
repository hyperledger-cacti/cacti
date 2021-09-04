import { isIPv4, isIPv6 } from "net";

export function determineAddressFamily(
  address: string,
): "IPv4" | "IPv6" | "IPvUnknown" {
  if (isIPv4(address)) {
    return "IPv4";
  } else if (isIPv6(address)) {
    return "IPv6";
  } else {
    return "IPvUnknown";
  }
}
