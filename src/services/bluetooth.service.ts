import { BleManager, type Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export class BluetoothService {
  private readonly manager = new BleManager();

  async scanForDevices(): Promise<Device[]> {
    const discovered = new Map<string, Device>();
    return new Promise((resolve) => {
      this.manager.startDeviceScan(['180D'], null, (error, device) => {
        if (error) {
          this.manager.stopDeviceScan();
          resolve([]);
          return;
        }
        if (device?.id) discovered.set(device.id, device);
      });

      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(Array.from(discovered.values()));
      }, 5000);
    });
  }

  async connectToDevice(deviceId: string): Promise<void> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
  }

  async subscribeToHeartRate(deviceId: string, onData: (heartRate: number) => void): Promise<void> {
    await this.manager.monitorCharacteristicForDevice(deviceId, '180D', '2A37', (error, characteristic) => {
      if (error || !characteristic?.value) return;
      const value = Buffer.from(characteristic.value, 'base64');
      const hr = value[1] ?? 0;
      onData(hr);
    });
  }

  async syncVitalsHistory(_deviceId: string): Promise<Array<{ heartRate: number; recorded_at: string }>> {
    return [];
  }
}
