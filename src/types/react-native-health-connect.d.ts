/**
 * Type stub for react-native-health-connect.
 *
 * The real module is only available in an Expo Dev Build.
 * This file satisfies the TypeScript compiler until the package
 * is installed via: npm install react-native-health-connect
 *
 * DO NOT import from this file directly — it is picked up
 * automatically by the TypeScript module resolution.
 */
declare module 'react-native-health-connect' {
  export type SdkAvailabilityStatus = 1 | 2 | 3;

  export type RecordType =
    | 'HeartRate'
    | 'Steps'
    | 'OxygenSaturation'
    | 'SleepSession'
    | 'BloodPressure'
    | 'BodyTemperature';

  export type AccessType = 'read' | 'write';

  export interface PermissionRequest {
    accessType: AccessType;
    recordType: RecordType;
  }

  export interface GrantedPermission {
    accessType: AccessType;
    recordType: RecordType;
  }

  export interface TimeRangeFilter {
    operator: 'between' | 'before' | 'after';
    startTime?: string;
    endTime?: string;
    time?: string;
  }

  export interface ReadRecordsOptions {
    timeRangeFilter: TimeRangeFilter;
    limit?: number;
    ascendingOrder?: boolean;
  }

  export interface ReadRecordsResult<T = any> {
    records: T[];
  }

  /** Returns SdkAvailabilityStatus: 1=Installed, 2=NotInstalled, 3=NotSupported */
  export function getSdkStatus(): Promise<SdkAvailabilityStatus>;

  export function requestPermission(
    permissions: PermissionRequest[],
  ): Promise<GrantedPermission[]>;

  export function getGrantedPermissions(): Promise<GrantedPermission[]>;

  export function readRecords(
    recordType: RecordType,
    options: ReadRecordsOptions,
  ): Promise<ReadRecordsResult>;

  export function revokeAllPermissions(): Promise<void>;

  export function initialize(): Promise<boolean>;
}
