/**
 * BLE (Bluetooth Low Energy) Smartwatch Service
 *
 * Architecture stub using react-native-ble-plx.
 * Implement the marked sections when adding real hardware integration.
 *
 * Assumed device profile:
 *   - Service UUID: 180D (Heart Rate) or custom
 *   - Characteristic UUIDs: device-specific
 *
 * Install: npx expo install react-native-ble-plx
 * Requires ejecting or using a development build (not Expo Go).
 */

import type { BleDevice, BleVitalsStreamPayload } from '../types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BleConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface BleServiceCallbacks {
  onDeviceFound: (device: BleDevice) => void;
  onVitalsData: (payload: BleVitalsStreamPayload) => void;
  onConnectionStateChange: (state: BleConnectionState) => void;
  onError: (message: string) => void;
}

// ─── Known BLE UUIDs (customize per smartwatch SDK) ──────────────────────────

const BLE_UUIDS = {
  HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  // Add SpO2, temperature, steps UUIDs for your target device here
  SPO2_SERVICE: '00001822-0000-1000-8000-00805f9b34fb',
  SPO2_MEASUREMENT: '00002a5f-0000-1000-8000-00805f9b34fb',
} as const;

// ─── Service Implementation ───────────────────────────────────────────────────

class BLEService {
  // NOTE: In production, uncomment and use the real BleManager:
  // private manager = new BleManager();
  private manager: unknown = null;
  private connectedDeviceId: string | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: BleServiceCallbacks | null = null;

  /**
   * Check if Bluetooth is available and permissions are granted.
   * On Android 12+: BLUETOOTH_SCAN + BLUETOOTH_CONNECT permissions required.
   * On iOS: NSBluetoothAlwaysUsageDescription in Info.plist.
   */
  async checkPermissions(): Promise<boolean> {
    // TODO: Implement with react-native-ble-plx BleManager.state()
    // const state = await this.manager.state();
    // return state === State.PoweredOn;
    console.warn('[BLE] checkPermissions: stub — implement with real BleManager');
    return false;
  }

  /**
   * Register callbacks for this BLE session.
   */
  init(callbacks: BleServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Scan for nearby BLE devices advertising health services.
   * Stops automatically after `timeoutMs`.
   */
  startScan(timeoutMs = 10000): void {
    if (!this.callbacks) {
      console.error('[BLE] Call init() before startScan()');
      return;
    }

    this.callbacks.onConnectionStateChange('scanning');

    // TODO: Implement with real BleManager:
    // this.manager.startDeviceScan(
    //   [BLE_UUIDS.HEART_RATE_SERVICE],
    //   { allowDuplicates: false },
    //   (error, device) => {
    //     if (error) { this.callbacks?.onError(error.message); return; }
    //     if (device) {
    //       this.callbacks?.onDeviceFound({ id: device.id, name: device.name, rssi: device.rssi });
    //     }
    //   }
    // );

    console.warn('[BLE] startScan: stub — implement with react-native-ble-plx');

    this.scanTimeoutId = setTimeout(() => this.stopScan(), timeoutMs);
  }

  /**
   * Stop the active scan.
   */
  stopScan(): void {
    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }

    // TODO: this.manager.stopDeviceScan();
    this.callbacks?.onConnectionStateChange('idle');
    console.warn('[BLE] stopScan: stub');
  }

  /**
   * Connect to a specific device by ID.
   */
  async connectToDevice(deviceId: string, deviceName: string): Promise<void> {
    this.callbacks?.onConnectionStateChange('connecting');

    try {
      // TODO: Implement connection:
      // const device = await this.manager.connectToDevice(deviceId);
      // await device.discoverAllServicesAndCharacteristics();
      // this.connectedDeviceId = deviceId;
      // this.callbacks?.onConnectionStateChange('connected');
      // this.startVitalsStream(device, deviceId, deviceName);

      console.warn('[BLE] connectToDevice: stub — implement with react-native-ble-plx');
      this.callbacks?.onError('BLE integration not yet implemented on this device.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'BLE connection failed';
      this.callbacks?.onError(msg);
      this.callbacks?.onConnectionStateChange('error');
    }
  }

  /**
   * Subscribe to vitals stream from a connected device.
   * Called internally after a successful connection.
   */
  private startVitalsStream(
    _device: unknown,
    deviceId: string,
    deviceName: string
  ): void {
    // TODO: Monitor the heart rate characteristic:
    // _device.monitorCharacteristicForService(
    //   BLE_UUIDS.HEART_RATE_SERVICE,
    //   BLE_UUIDS.HEART_RATE_MEASUREMENT,
    //   (error, char) => {
    //     if (error || !char?.value) return;
    //     const heartRate = parseHeartRateCharacteristic(char.value);
    //     this.callbacks?.onVitalsData({
    //       heartRate,
    //       deviceId,
    //       deviceName,
    //       timestamp: new Date().toISOString(),
    //     });
    //   }
    // );

    console.warn('[BLE] startVitalsStream: stub', { deviceId, deviceName });
  }

  /**
   * Disconnect from the currently connected device.
   */
  async disconnect(): Promise<void> {
    if (!this.connectedDeviceId) return;

    // TODO: await this.manager.cancelDeviceConnection(this.connectedDeviceId);
    this.connectedDeviceId = null;
    this.callbacks?.onConnectionStateChange('disconnected');
    console.warn('[BLE] disconnect: stub');
  }

  /**
   * Parse the BLE Heart Rate Measurement characteristic (GATT spec).
   * The first byte flags determine if HR value is 8-bit or 16-bit.
   */
  parseHeartRateCharacteristic(base64Value: string): number {
    // TODO: Implement base64 → bytes → HR parsing per GATT spec:
    // const bytes = Buffer.from(base64Value, 'base64');
    // const flags = bytes[0];
    // const is16bit = (flags & 0x01) !== 0;
    // return is16bit ? bytes.readUInt16LE(1) : bytes[1];
    console.warn('[BLE] parseHeartRateCharacteristic: stub', { base64Value });
    return 0;
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }
}

// Singleton export
export const bleService = new BLEService();
export { BLE_UUIDS };
