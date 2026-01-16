export const EXTENSION_ID = 'awsToolkitProfileExporter';
export const EXTENSION_NAME = 'AWS Toolkit Profile Exporter';

export function extensionScopedId(id: string): string {
  return `${EXTENSION_ID}.${id}`;
}

export function omitNullish<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T as T[K] extends null | undefined ? never : K]: T[K] } {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  ) as any;
}
