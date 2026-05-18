declare module 'net-snmp' {
  export const Version2c: number;
  export const Version1: number;
  export const Version3: number;

  export interface SessionOptions {
    port?: number;
    retries?: number;
    timeout?: number;
    transport?: string;
    trapPort?: number;
    version?: number;
    idBitsSize?: number;
  }

  export interface Varbind {
    oid: string;
    type: number;
    value: unknown;
  }

  export interface Session {
    get(
      oids: string[],
      cb: (error: Error | null, varbinds: Varbind[]) => void,
    ): void;
    close(): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }

  export function createSession(
    target: string,
    community: string,
    options?: SessionOptions,
  ): Session;

  export function isVarbindError(varbind: Varbind): boolean;
  export function varbindError(varbind: Varbind): string;
}
