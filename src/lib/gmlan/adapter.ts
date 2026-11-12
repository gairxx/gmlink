/**
 * Hardware Adapter Connection & Protocol Handshake Engine
 * Supports:
 * - STN-based OBDLink MX/MX+ (with STP 62 native SW-CAN switching on Pin 1)
 * - Standard ELM327 command set (ATZ, ATE0, ATH1, ATSP 6)
 * - Microcontroller hardware (MCP2515 + TH8056/NCV7356)
 * - Built-in Virtual CAN Bus Simulator (vcan0)
 * - Real hardware access via WebSerial API
 */

import { GmVehicleBusSimulator } from './busSimulator';
import {
  AdapterChipset,
  BusType,
  CanFrame,
  SafetyState,
  VehicleTelemetry,
} from './types';
import { createTesterPresentFrame } from './uds';

export interface AdapterHandshakeStatus {
  isConnected: boolean;
  isConnecting: boolean;
  adapterModel: string;
  firmwareVersion: string;
  voltageDetected: number;
  selectedBus: BusType;
  filterMaskActive: boolean;
  listenOnlyMode: boolean;
  testerPresentActive: boolean;
  baudRateKbps: number;
  logLines: string[];
}

export class GmlanAdapterEngine {
  public simulator: GmVehicleBusSimulator;
  public status: AdapterHandshakeStatus = {
    isConnected: false,
    isConnecting: false,
    adapterModel: 'Virtual Loopback (vcan0)',
    firmwareVersion: 'STN2120 v5.4.1 (Simulated)',
    voltageDetected: 14.2,
    selectedBus: 'HS_CAN',
    filterMaskActive: false,
    listenOnlyMode: true, // Default listen-only
    testerPresentActive: false,
    baudRateKbps: 500,
    logLines: [],
  };

  public safety: SafetyState = {
    listenOnlyMode: true,
    speedLockoutActive: false,
    watchdogTimerMs: 10000,
    txBufferOverflow: false,
    busOffDetected: false,
    ackFailures: 0,
  };

  private frameListeners: Array<(frame: CanFrame) => void> = [];
  private telemetryListeners: Array<(telemetry: VehicleTelemetry) => void> = [];
  private statusListeners: Array<(status: AdapterHandshakeStatus) => void> = [];
  private testerPresentInterval: NodeJS.Timeout | null = null;

  // WebSerial port reference if connected to real physical hardware
  private serialPort: any = null;
  private serialReader: any = null;
  private serialWriter: any = null;

  constructor() {
    this.simulator = new GmVehicleBusSimulator();

    // Route simulator frames to adapter subscribers
    this.simulator.subscribeFrames((frame) => {
      this.notifyFrame(frame);
    });

    this.simulator.subscribeTelemetry((telemetry) => {
      this.status.voltageDetected = telemetry.busVoltage12V;
      this.safety.speedLockoutActive = telemetry.vehicleSpeedMph > 0;
      this.notifyTelemetry(telemetry);
    });
  }

  public subscribeFrames(cb: (frame: CanFrame) => void) {
    this.frameListeners.push(cb);
    return () => {
      this.frameListeners = this.frameListeners.filter((l) => l !== cb);
    };
  }

  public subscribeTelemetry(cb: (telemetry: VehicleTelemetry) => void) {
    this.telemetryListeners.push(cb);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== cb);
    };
  }

  public subscribeStatus(cb: (status: AdapterHandshakeStatus) => void) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  private log(message: string) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const line = `[${timestamp}] ${message}`;
    this.status.logLines = [line, ...this.status.logLines.slice(0, 49)];
    this.notifyStatus();
  }

  private notifyFrame(frame: CanFrame) {
    for (const cb of this.frameListeners) cb(frame);
  }

  private notifyTelemetry(telemetry: VehicleTelemetry) {
    for (const cb of this.telemetryListeners) cb(telemetry);
  }

  private notifyStatus() {
    for (const cb of this.statusListeners) cb({ ...this.status });
  }

  /**
   * Connect to Virtual CAN Bus (Default test bench)
   */
  public async connectVirtual(): Promise<boolean> {
    this.status.isConnecting = true;
    this.notifyStatus();

    this.log('Initiating adapter protocol handshake...');
    await this.delay(100);
    this.log('TX -> ATZ (Reset hardware adapter)');
    await this.delay(150);
    this.log('RX <- ELM327 v1.5 / STN2120 v5.4.1');
    await this.delay(100);
    this.log('TX -> ATE0 (Echo off)');
    await this.delay(50);
    this.log('TX -> ATH1 (CAN Headers on)');
    await this.delay(50);
    this.log('TX -> ATL0 (Linefeeds off)');
    await this.delay(50);

    // Initial bus protocol
    if (this.status.selectedBus === 'SW_CAN') {
      this.log('TX -> STP 62 (OBDLink Native Single-Wire CAN 33.333 kbps on Pin 1)');
      this.status.baudRateKbps = 33.3;
    } else {
      this.log('TX -> AT SP 6 (ISO 15765-4 CAN 11-bit 500k on Pins 6 & 14)');
      this.status.baudRateKbps = 500;
    }

    await this.delay(100);
    this.log('TX -> AT RV (Read 12V bus voltage)');
    this.log('RX <- 14.2V');
    this.log('Adapter boot into Listen-Only / Passive Monitoring mode (ATMA default)');

    this.status.isConnecting = false;
    this.status.isConnected = true;
    this.status.listenOnlyMode = true;
    this.safety.listenOnlyMode = true;

    this.simulator.start();
    this.startTesterPresentWorker();
    this.notifyStatus();
    return true;
  }

  /**
   * Switch Active Bus Topology (SW-CAN 33.3k Pin 1 vs HS-CAN 500k Pins 6/14)
   */
  public switchBus(bus: BusType) {
    this.status.selectedBus = bus;
    if (bus === 'SW_CAN') {
      this.status.baudRateKbps = 33.333;
      this.log('Protocol switch: STP 62 -> SW-CAN (Low-Speed Single-Wire 33.333 kbps on OBD-II Pin 1)');
    } else {
      this.status.baudRateKbps = 500;
      this.log('Protocol switch: AT SP 6 -> HS-CAN (High-Speed Dual-Wire 500 kbps on OBD-II Pins 6/14)');
    }
    this.notifyStatus();
  }

  /**
   * Safe Transmission Toggle: User explicitly approves active frame injection
   */
  public setListenOnlyMode(listenOnly: boolean) {
    this.status.listenOnlyMode = listenOnly;
    this.safety.listenOnlyMode = listenOnly;
    if (listenOnly) {
      this.log('Safety Interlock: Switched to LISTEN-ONLY (Passive CAN Sniffing)');
    } else {
      this.log('Safety Interlock: TRANSMIT UNLOCKED by Operator Acknowledgment');
    }
    this.notifyStatus();
  }

  /**
   * Configure CAN Filtering & Masking (Simulating ELM327 AT CRA / AT CF / AT CM)
   */
  public configureFilter(filterIdHex: string, maskHex: string = '7FF') {
    if (!filterIdHex) {
      this.status.filterMaskActive = false;
      this.log('TX -> AT AR (Filter reset to accept all Arbitration IDs)');
    } else {
      this.status.filterMaskActive = true;
      this.log(`TX -> AT CRA ${filterIdHex} (Receive Filter ID: 0x${filterIdHex})`);
      this.log(`TX -> AT CM ${maskHex} (Mask: 0x${maskHex})`);
    }
    this.notifyStatus();
  }

  /**
   * Periodic TesterPresent Worker Thread (0x3E)
   * Maintains active diagnostic sessions on 2.5 second cadence
   */
  private startTesterPresentWorker() {
    if (this.testerPresentInterval) clearInterval(this.testerPresentInterval);
    this.status.testerPresentActive = true;

    this.testerPresentInterval = setInterval(() => {
      if (!this.status.isConnected || this.safety.listenOnlyMode) return;
      // Send 0x3E TesterPresent heartbeat
      const tpFrame = createTesterPresentFrame(true); // Suppress positive response
      this.transmitFrame(tpFrame, true);
    }, 2500);
  }

  /**
   * Transmit CAN Frame with Safety Interlock Check
   */
  public transmitFrame(frame: CanFrame, isHeartbeat: boolean = false): boolean {
    if (!this.status.isConnected) {
      this.log('TX Failed: Adapter not connected');
      return false;
    }

    if (this.safety.listenOnlyMode && !isHeartbeat) {
      this.log('TX Blocked: Adapter is in LISTEN-ONLY mode. Unlock TX first.');
      return false;
    }

    // Critical chassis speed lockout: Check if vehicle is moving
    const speed = this.simulator.currentSpeedMph;
    if (speed > 0) {
      // If attempting high-risk chassis actuation (e.g. ABS bleed or gauge sweep while moving)
      if (frame.id === 0x7e0 && frame.data[1] === 0xae && frame.data[2] !== 0x20) {
        this.log(`SAFETY LOCKOUT: Actuation blocked. Vehicle speed is ${speed.toFixed(1)} mph (> 0).`);
        return false;
      }
    }

    // Send frame to simulator or physical serial port
    if (this.serialWriter) {
      this.writeSerialFrame(frame);
    } else {
      this.simulator.receiveFrame(frame);
    }

    if (!isHeartbeat) {
      const hexPayload = frame.data.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      this.log(`TX [${frame.bus}] ID:0x${frame.id.toString(16).toUpperCase()} Data:[${hexPayload}]`);
    }

    return true;
  }

  /**
   * Real Hardware WebSerial API Connection
   */
  public async connectWebSerial(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      this.log('WebSerial API is not supported in this browser environment. Using Virtual Loopback.');
      return false;
    }

    try {
      this.status.isConnecting = true;
      this.notifyStatus();
      this.log('Opening WebSerial Port Selector...');

      const navSerial = (navigator as any).serial;
      this.serialPort = await navSerial.requestPort();
      await this.serialPort.open({ baudRate: 115200 });

      this.log('Connected to USB Serial Adapter at 115200 baud.');
      this.status.adapterModel = 'USB Hardware Adapter (OBDLink/ELM327)';
      this.status.isConnected = true;
      this.status.isConnecting = false;
      this.notifyStatus();

      this.startSerialReader();
      return true;
    } catch (err: any) {
      this.log(`WebSerial Connection Error: ${err?.message || err}`);
      this.status.isConnecting = false;
      this.notifyStatus();
      return false;
    }
  }

  private async startSerialReader() {
    if (!this.serialPort || !this.serialPort.readable) return;
    try {
      const textDecoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(textDecoder.writable);
      this.serialReader = textDecoder.readable.getReader();

      let buffer = '';
      while (true) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\r');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.handleSerialIncomingLine(trimmed);
          }
        }
      }
    } catch (err: any) {
      this.log(`Serial Read Terminated: ${err?.message}`);
    }
  }

  private handleSerialIncomingLine(line: string) {
    this.log(`RX <- ${line}`);
    // Parse raw hex frame from ELM327 format: e.g. "0C9 8 04 12 34 56 78 9A BC DE"
    const parts = line.split(' ');
    if (parts.length >= 3) {
      const id = parseInt(parts[0], 16);
      if (!isNaN(id)) {
        const dlc = parseInt(parts[1], 10) || 8;
        const data = parts.slice(2).map((h) => parseInt(h, 16)).filter((n) => !isNaN(n));
        const frame: CanFrame = {
          id,
          isExtended: id > 0x7ff,
          bus: this.status.selectedBus,
          direction: 'RX',
          dlc,
          timestamp: Date.now(),
          data,
        };
        this.notifyFrame(frame);
      }
    }
  }

  private async writeSerialFrame(frame: CanFrame) {
    if (!this.serialPort || !this.serialPort.writable) return;
    try {
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.serialPort.writable);
      const writer = textEncoder.writable.getWriter();
      const hexId = frame.id.toString(16).toUpperCase();
      const hexData = frame.data.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
      await writer.write(`${hexId}${hexData}\r`);
      writer.releaseLock();
    } catch (err: any) {
      this.log(`Serial Write Error: ${err?.message}`);
    }
  }

  public disconnect() {
    if (this.testerPresentInterval) clearInterval(this.testerPresentInterval);
    this.simulator.stop();

    if (this.serialReader) {
      this.serialReader.cancel().catch(() => {});
    }
    if (this.serialPort) {
      this.serialPort.close().catch(() => {});
    }

    this.status.isConnected = false;
    this.status.isConnecting = false;
    this.status.testerPresentActive = false;
    this.log('Adapter disconnected.');
    this.notifyStatus();
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
