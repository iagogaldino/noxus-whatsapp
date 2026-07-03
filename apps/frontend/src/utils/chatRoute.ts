export function resolveRouteChatId(routeId?: string): string | undefined {
  if (!routeId) return undefined;
  try {
    return decodeURIComponent(routeId);
  } catch {
    return routeId;
  }
}

export function sameChatId(a: string, b: string): boolean {
  if (a === b) return true;
  const decodedA = resolveRouteChatId(a);
  const decodedB = resolveRouteChatId(b);
  return decodedA === b || decodedB === a || decodedA === decodedB;
}
