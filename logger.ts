/** Minimal structured console logger shared by all mock services. */
export function makeLogger(serviceName: string) {
  const prefix = `[${serviceName}]`;
  return {
    info: (...args: unknown[]) => console.log(prefix, new Date().toISOString(), ...args),
    warn: (...args: unknown[]) => console.warn(prefix, new Date().toISOString(), ...args),
    error: (...args: unknown[]) => console.error(prefix, new Date().toISOString(), ...args),
  };
}
