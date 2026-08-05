/**
 * Resolver shim.
 *
 * Metro prefers MapCard.native.tsx on device and MapCard.web.tsx on web; this
 * file exists so TypeScript has something to resolve when screens import
 * './MapCard' without an extension.
 */
export type { MapCardProps } from './MapCard.native';
export { default } from './MapCard.web';
