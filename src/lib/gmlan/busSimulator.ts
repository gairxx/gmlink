/**
 * Virtual CAN Bus Engine (vcan0) & GM Vehicle ECU Simulator
 * Generates authentic periodic broadcast frames for SW-CAN (33.3k) and HS-CAN (500k),
 * handles simulated physics (engine RPM, speed, steering, brake), and acts as a responsive UDS server.
 */

import {
  decode0x005,
  decode0x018,
  decode0x028,
  decode0x05B,
  decode0x061,
  decode0x064,
  decode0x0C9,
  decode0x182,
  decode0x186,
  encode0x004,
  encode0x005,
  encode0x00F,
  encode0x018,
  encode0x028,
  encode0x05B,
  encode0x061,
  encode0x064,
  encode0x0C9,
  encode0x182,
  encode0x185,
  encode0x186Frames,
} from './messages';
import {
  BusType,
  CanFrame,
  DeviceControlRoutine,
  DeviceControlStatus,
  DicDisplayState,
  DicIcons,
  HvacStatus,
  RfaFunction,
  TpmsState,
  VehicleTelemetry,
} from './types';
import { calculateGmSecurityKey, GM_MODE06_PRESETS, UdsServiceId } from './uds';

export class GmVehicleBusSimulator {
  // Vehicle dynamic variables
  public engineRunning = true;
  public throttlePct = 0;
  public brakePosPct = 0;
  public brakePressed = false;
  public gear: 'P' | 'R' | 'N' | 'D' = 'D';
  public targetSpeedMph = 45;
  public currentSpeedMph = 42.5;
  public currentRpm = 1850;
  public steeringAngleDeg = 0;
  public steeringRateDegSec = 0;
  public outsideTempC = 22.0;
  public busVoltage = 14.2;
  public doorsLocked = true;
  public headlightsOn = false;

  // Active Device Control state
  public deviceControl: DeviceControlStatus = {
    activeRoutine: null,
    watchdogRemainingSec: 10,
    isLockedOutSpeed: false,
    lastCommandSent: 'None',
    responseState: 'IDLE',
  };

  // UDS security session
  public securityUnlocked = false;
  public currentSeed = 0x3e4a;
  public activeSession: 'DEFAULT' | 'EXTENDED' | 'PROGRAMMING' = 'DEFAULT';
  public normalCommDisabled = false;

  // DIC State
  public dicState: DicDisplayState = {
    line1: 'SPEED 42.5 MPH',
    line2: 'RANGE 340 MILES',
    displayMode: 'NORMAL',
    scrollSpeedMs: 300,
    timeoutSec: 5,
    icons: {
      checkEngine: false,
      abs: false,
      tractionControl: false,
      oilPressure: false,
      batteryLow: false,
      airbag: false,
      highBeam: false,
      doorAjar: false,
      tpmsWarning: false,
      seatbelt: false,
      security: false,
    },
  };

  // TPMS State
  public tpmsState: TpmsState = {
    frontLeft: { psi: 32.5, kpa: 224, status: 'NORMAL', sensorBatteryOk: true },
    frontRight: { psi: 32.8, kpa: 226, status: 'NORMAL', sensorBatteryOk: true },
    rearLeft: { psi: 32.2, kpa: 222, status: 'NORMAL', sensorBatteryOk: true },
    rearRight: { psi: 32.4, kpa: 223, status: 'NORMAL', sensorBatteryOk: true },
  };

  // HVAC State
  public hvacState: HvacStatus = {
    fanSpeed: 3,
    acClutchEngaged: true,
    defrostActive: false,
    recirculation: false,
    driverTempSettingF: 72,
    passTempSettingF: 72,
    airFlowMode: 'PANEL',
    rearDefrostActive: false,
  };

  private timerInterval: NodeJS.Timeout | null = null;
  private onFrameListeners: Array<(frame: CanFrame) => void> = [];
  private onTelemetryListeners: Array<(telemetry: VehicleTelemetry) => void> = [];

  // Watchdog timer reference
  private watchdogInterval: NodeJS.Timeout | null = null;
  private gaugeSweepProgress = 0; // for active sweep routine

  constructor() {
    this.startWatchdog();
  }

  public subscribeFrames(cb: (frame: CanFrame) => void) {
    this.onFrameListeners.push(cb);
    return () => {
      this.onFrameListeners = this.onFrameListeners.filter((l) => l !== cb);
    };
  }

  public subscribeTelemetry(cb: (telemetry: VehicleTelemetry) => void) {
    this.onTelemetryListeners.push(cb);
    return () => {
      this.onTelemetryListeners = this.onTelemetryListeners.filter((l) => l !== cb);
    };
  }

  public start() {
    if (this.timerInterval) return;

    let tick = 0;
    this.timerInterval = setInterval(() => {
      tick++;
      this.stepPhysics();

      // Emit periodic broadcast frames based on GMLAN timing schedules
      // 0x05B Steering Angle: 10ms (every 1 tick)
      if (tick % 1 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x05B(this.steeringAngleDeg, this.steeringRateDegSec));
      }

      // 0x0C9 Engine Status: 20ms (every 2 ticks)
      if (tick % 2 === 0 && !this.normalCommDisabled) {
        this.emitFrame(
          encode0x0C9(
            this.currentRpm,
            this.brakePressed,
            this.brakePosPct,
            this.throttlePct,
            90
          )
        );
      }

      // 0x028 Vehicle Speed: 50ms (every 5 ticks)
      if (tick % 5 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x028(this.currentSpeedMph, this.gear));
      }

      // 0x064 HVAC Status: 200ms (every 20 ticks)
      if (tick % 20 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x064(this.hvacState));
      }

      // 0x182 DIC Icons: 250ms (every 25 ticks)
      if (tick % 25 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x182(this.dicState.icons));
      }

      // 0x018 12V Bus Voltage: 500ms (every 50 ticks)
      if (tick % 50 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x018(this.busVoltage));
      }

      // 0x061 Ambient Temp: 1000ms (every 100 ticks)
      if (tick % 100 === 0 && !this.normalCommDisabled) {
        this.emitFrame(encode0x061(this.outsideTempC));
      }

      // 0x005 TPMS: 2000ms (every 200 ticks)
      if (tick % 200 === 0 && !this.normalCommDisabled) {
        this.emitFrame(
          encode0x005(
            this.tpmsState.frontLeft.psi,
            this.tpmsState.frontRight.psi,
            this.tpmsState.rearLeft.psi,
            this.tpmsState.rearRight.psi
          )
        );
      }

      // Broadcast telemetry state update to UI
      if (tick % 5 === 0) {
        this.notifyTelemetry();
      }
    }, 10);
  }

  public stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startWatchdog() {
    this.watchdogInterval = setInterval(() => {
      if (this.deviceControl.activeRoutine) {
        if (this.deviceControl.watchdogRemainingSec > 0) {
          this.deviceControl.watchdogRemainingSec--;
        } else {
          // Auto ReturnToNormalMode trigger upon timeout
          this.returnToNormalMode('WATCHDOG_TIMEOUT');
        }
      }
    }, 1000);
  }

  private emitFrame(frame: CanFrame) {
    for (const listener of this.onFrameListeners) {
      listener(frame);
    }
  }

  private notifyTelemetry() {
    const telemetry = this.getTelemetrySnapshot();
    for (const listener of this.onTelemetryListeners) {
      listener(telemetry);
    }
  }

  public getTelemetrySnapshot(): VehicleTelemetry {
    return {
      engineRpm: Math.round(this.currentRpm),
      vehicleSpeedMph: Math.round(this.currentSpeedMph * 10) / 10,
      vehicleSpeedKmh: Math.round(this.currentSpeedMph * 1.60934 * 10) / 10,
      brakePedalPressed: this.brakePressed,
      brakePositionPct: this.brakePosPct,
      throttlePositionPct: this.throttlePct,
      busVoltage12V: Math.round(this.busVoltage * 100) / 100,
      steeringWheelAngleDeg: Math.round(this.steeringAngleDeg * 10) / 10,
      steeringRateDegSec: Math.round(this.steeringRateDegSec * 10) / 10,
      outsideAirTempC: Math.round(this.outsideTempC * 10) / 10,
      outsideAirTempF: Math.round(((this.outsideTempC * 9) / 5 + 32) * 10) / 10,
      steeringWheelButtons: {
        volumeUp: false,
        volumeDown: false,
        seekNext: false,
        seekPrev: false,
        voiceTrigger: false,
        mute: false,
      },
      tpms: { ...this.tpmsState },
      hvac: { ...this.hvacState },
      dic: {
        ...this.dicState,
        icons: { ...this.dicState.icons },
      },
      gear: this.gear,
      doorsLocked: this.doorsLocked,
      engineRunning: this.engineRunning,
    };
  }

  /**
   * Physics simulation step
   */
  private stepPhysics() {
    // If Gauge sweep routine is active in DeviceControl, animate gauges directly
    if (this.deviceControl.activeRoutine === 'GAUGE_SWEEP') {
      this.gaugeSweepProgress += 0.04;
      if (this.gaugeSweepProgress <= 1.0) {
        // Sweeping up to max
        this.currentRpm = Math.sin((this.gaugeSweepProgress * Math.PI) / 2) * 8000;
        this.currentSpeedMph = Math.sin((this.gaugeSweepProgress * Math.PI) / 2) * 160;
      } else if (this.gaugeSweepProgress <= 2.0) {
        // Sweeping back to zero
        const sweepDown = 2.0 - this.gaugeSweepProgress;
        this.currentRpm = Math.sin((sweepDown * Math.PI) / 2) * 8000;
        this.currentSpeedMph = Math.sin((sweepDown * Math.PI) / 2) * 160;
      } else {
        // Complete sweep
        this.returnToNormalMode('COMPLETED');
      }
      return;
    }

    if (!this.engineRunning) {
      this.currentRpm = Math.max(0, this.currentRpm - 150);
      this.currentSpeedMph = Math.max(0, this.currentSpeedMph - 0.4);
      this.busVoltage = 12.3;
      return;
    }

    // Engine running physics
    this.busVoltage = 14.15 + (this.throttlePct / 100) * 0.25;

    // Cylinder cutout active?
    const hasCutout = this.deviceControl.activeRoutine === 'CYLINDER_CUTOUT';
    const cutoutDrag = hasCutout ? 180 : 0;

    // Normal driving dynamics
    if (this.gear === 'P' || this.gear === 'N') {
      const targetIdleRpm = 650 + (this.throttlePct / 100) * 4500 - cutoutDrag;
      this.currentRpm += (targetIdleRpm - this.currentRpm) * 0.15;
      this.currentSpeedMph = Math.max(0, this.currentSpeedMph - 0.6);
    } else {
      // In Gear (D or R)
      if (this.brakePressed || this.brakePosPct > 10) {
        this.currentSpeedMph = Math.max(0, this.currentSpeedMph - (this.brakePosPct / 100) * 1.8);
      } else if (this.throttlePct > 0) {
        const topSpeed = (this.throttlePct / 100) * 125;
        this.currentSpeedMph += (topSpeed - this.currentSpeedMph) * 0.035;
      } else {
        // Coasting
        this.currentSpeedMph = Math.max(0, this.currentSpeedMph - 0.08);
      }

      const calculatedRpm = Math.max(680, this.currentSpeedMph * 38.5 + (this.throttlePct / 100) * 1200) - cutoutDrag;
      this.currentRpm += (calculatedRpm - this.currentRpm) * 0.12;
    }

    // Steering return to center
    if (Math.abs(this.steeringAngleDeg) > 0.5) {
      this.steeringRateDegSec = -this.steeringAngleDeg * 1.5;
    } else {
      this.steeringRateDegSec = 0;
    }
  }

  /**
   * Handle Inbound CAN Frame (e.g. from UI injection, diagnostic tool, or serial adapter)
   */
  public receiveFrame(frame: CanFrame): CanFrame[] {
    const responses: CanFrame[] = [];
    const id = frame.id;
    const data = frame.data;

    // Log the transmitted frame
    this.emitFrame(frame);

    // 1. Diagnostic Request: 0x7DF (Functional) or 0x7E0 (ECM Physical)
    if (id === 0x7df || id === 0x7e0) {
      const len = data[0];
      const serviceId = data[1];

      // Diagnostic Session Control (0x10)
      if (serviceId === UdsServiceId.DIAGNOSTIC_SESSION_CONTROL) {
        const sessionType = data[2];
        if (sessionType === 0x01) this.activeSession = 'DEFAULT';
        else if (sessionType === 0x02) this.activeSession = 'PROGRAMMING';
        else if (sessionType === 0x03) this.activeSession = 'EXTENDED';

        responses.push({
          id: 0x7e8,
          isExtended: false,
          bus: 'HS_CAN',
          direction: 'RX',
          dlc: 8,
          timestamp: Date.now(),
          data: [0x06, 0x50, sessionType, 0x00, 0x32, 0x01, 0xf4, 0xaa],
        });
      }

      // Security Access (0x27)
      else if (serviceId === UdsServiceId.SECURITY_ACCESS) {
        const subFunc = data[2];
        if (subFunc === 0x01) {
          // Seed Request
          this.currentSeed = 0x4100 + (Math.floor(Math.random() * 0x3eff) & 0xffff);
          const seedHigh = (this.currentSeed >> 8) & 0xff;
          const seedLow = this.currentSeed & 0xff;
          responses.push({
            id: 0x7e8,
            isExtended: false,
            bus: 'HS_CAN',
            direction: 'RX',
            dlc: 8,
            timestamp: Date.now(),
            data: [0x04, 0x67, 0x01, seedHigh, seedLow, 0xaa, 0xaa, 0xaa],
          });
        } else if (subFunc === 0x02) {
          // Key Send
          const sentKey = (data[3] << 8) | data[4];
          const expectedKey = calculateGmSecurityKey(this.currentSeed, 1);
          if (sentKey === expectedKey) {
            this.securityUnlocked = true;
            responses.push({
              id: 0x7e8,
              isExtended: false,
              bus: 'HS_CAN',
              direction: 'RX',
              dlc: 8,
              timestamp: Date.now(),
              data: [0x02, 0x67, 0x02, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
            });
          } else {
            // Negative response: Invalid Key (0x35)
            responses.push({
              id: 0x7e8,
              isExtended: false,
              bus: 'HS_CAN',
              direction: 'RX',
              dlc: 8,
              timestamp: Date.now(),
              data: [0x03, 0x7f, 0x27, 0x35, 0xaa, 0xaa, 0xaa, 0xaa],
            });
          }
        }
      }

      // Tester Present (0x3E)
      else if (serviceId === UdsServiceId.TESTER_PRESENT) {
        const suppress = (data[2] & 0x80) !== 0;
        if (!suppress) {
          responses.push({
            id: 0x7e8,
            isExtended: false,
            bus: 'HS_CAN',
            direction: 'RX',
            dlc: 8,
            timestamp: Date.now(),
            data: [0x02, 0x7e, data[2] & 0x7f, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
          });
        }
      }

      // Communication Control (0x28)
      else if (serviceId === UdsServiceId.COMMUNICATION_CONTROL) {
        const subFunc = data[2];
        this.normalCommDisabled = subFunc === 0x01;
        responses.push({
          id: 0x7e8,
          isExtended: false,
          bus: 'HS_CAN',
          direction: 'RX',
          dlc: 8,
          timestamp: Date.now(),
          data: [0x02, 0x68, subFunc, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
        });
      }

      // Mode $06 Onboard Monitor Test Query
      else if (serviceId === UdsServiceId.MODE_06_ONBOARD_MONITOR) {
        const reqMid = data[2];
        const match = GM_MODE06_PRESETS.find((p) => p.mid === reqMid) || GM_MODE06_PRESETS[0];
        const valHigh = (match.testValueRaw >> 8) & 0xff;
        const valLow = match.testValueRaw & 0xff;
        responses.push({
          id: 0x7e8,
          isExtended: false,
          bus: 'HS_CAN',
          direction: 'RX',
          dlc: 8,
          timestamp: Date.now(),
          data: [0x06, 0x46, match.mid, match.tid, match.uasid, valHigh, valLow, 0xaa],
        });
      }

      // Mode $AE / 0x2F Device Control
      else if (
        serviceId === UdsServiceId.GMLAN_DEVICE_CONTROL ||
        serviceId === UdsServiceId.INPUT_OUTPUT_CONTROL_BY_ID
      ) {
        const routineCode = data[2];
        const controlState = data[3];

        // Safety lockout: if vehicle speed > 0, refuse critical actuator tests!
        if (this.currentSpeedMph > 0 && routineCode !== 0x20) {
          this.deviceControl.isLockedOutSpeed = true;
          this.deviceControl.responseState = 'REJECTED_SPEED_LOCKOUT';
          responses.push({
            id: 0x7e8,
            isExtended: false,
            bus: 'HS_CAN',
            direction: 'RX',
            dlc: 8,
            timestamp: Date.now(),
            data: [0x03, 0x7f, serviceId, 0x22, 0xaa, 0xaa, 0xaa, 0xaa], // NRC 0x22 = ConditionsNotCorrect
          });
        } else {
          this.handleDeviceControlExecution(routineCode, controlState, data[4]);
          responses.push({
            id: 0x7e8,
            isExtended: false,
            bus: 'HS_CAN',
            direction: 'RX',
            dlc: 8,
            timestamp: Date.now(),
            data: [0x04, serviceId + 0x40, routineCode, controlState, 0x00, 0xaa, 0xaa, 0xaa],
          });
        }
      }
    }

    // 2. Body Control & Cluster Actuation (0x186 DIC text write)
    if (id === 0x186) {
      const decoded = decode0x186(data);
      if (decoded) {
        if (decoded.lineNumber === 1) {
          if (decoded.seqIndex === 0) this.dicState.line1 = decoded.textSegment;
          else this.dicState.line1 += decoded.textSegment;
        } else if (decoded.lineNumber === 2) {
          if (decoded.seqIndex === 0) this.dicState.line2 = decoded.textSegment;
          else this.dicState.line2 += decoded.textSegment;
        }
      }
    }

    // 0x182 DIC Icon toggle
    if (id === 0x182) {
      const decodedIcons = decode0x182(data);
      if (decodedIcons) {
        this.dicState.icons = { ...this.dicState.icons, ...decodedIcons };
      }
    }

    // 0x004 Keyless Entry Trigger
    if (id === 0x004) {
      const funcByte = data[0];
      if (funcByte === 0x01) {
        this.doorsLocked = true;
      } else if (funcByte === 0x02) {
        this.doorsLocked = false;
      }
    }

    // 0x064 Climate control change
    if (id === 0x064) {
      const decodedHvac = decode0x064(data);
      if (decodedHvac) {
        this.hvacState = { ...this.hvacState, ...decodedHvac };
      }
    }

    // Emit responses to listeners
    for (const resp of responses) {
      this.emitFrame(resp);
    }

    return responses;
  }

  private handleDeviceControlExecution(routineCode: number, controlState: number, param: number) {
    if (controlState === 0x20 || routineCode === 0x20) {
      this.returnToNormalMode('COMPLETED');
      return;
    }

    this.deviceControl.watchdogRemainingSec = 10; // reset 10s watchdog

    switch (routineCode) {
      case 0x01: // GAUGE_SWEEP
        this.deviceControl.activeRoutine = 'GAUGE_SWEEP';
        this.deviceControl.responseState = 'ACTIVE';
        this.gaugeSweepProgress = 0;
        break;
      case 0x02: // BULB_CHECK
        this.deviceControl.activeRoutine = 'BULB_CHECK';
        this.deviceControl.responseState = 'ACTIVE';
        // Turn on all cluster warning lamps
        this.dicState.icons = {
          checkEngine: true,
          abs: true,
          tractionControl: true,
          oilPressure: true,
          batteryLow: true,
          airbag: true,
          highBeam: true,
          doorAjar: true,
          tpmsWarning: true,
          seatbelt: true,
          security: true,
        };
        break;
      case 0x03: // ABS_BLEED
        this.deviceControl.activeRoutine = 'ABS_BLEED';
        this.deviceControl.responseState = 'ACTIVE';
        break;
      case 0x04: // EVAP_PURGE_VENT
        this.deviceControl.activeRoutine = 'EVAP_PURGE_VENT';
        this.deviceControl.responseState = 'ACTIVE';
        break;
      case 0x05: // FUEL_PUMP_PRIME
        this.deviceControl.activeRoutine = 'FUEL_PUMP_PRIME';
        this.deviceControl.responseState = 'ACTIVE';
        break;
      case 0x06: // COOLING_FAN_LOW
        this.deviceControl.activeRoutine = 'COOLING_FAN_LOW';
        this.deviceControl.responseState = 'ACTIVE';
        break;
      case 0x07: // COOLING_FAN_HIGH
        this.deviceControl.activeRoutine = 'COOLING_FAN_HIGH';
        this.deviceControl.responseState = 'ACTIVE';
        break;
      case 0x10: // CYLINDER_CUTOUT
        this.deviceControl.activeRoutine = 'CYLINDER_CUTOUT';
        this.deviceControl.cylCutoutNumber = param || 1;
        this.deviceControl.responseState = 'ACTIVE';
        break;
      default:
        this.returnToNormalMode('COMPLETED');
    }
  }

  /**
   * Return all module control overrides back to normal factory operating mode ($20)
   */
  public returnToNormalMode(reason: 'COMPLETED' | 'WATCHDOG_TIMEOUT' | 'USER_EXIT' = 'USER_EXIT') {
    this.deviceControl.activeRoutine = null;
    this.deviceControl.responseState = reason === 'WATCHDOG_TIMEOUT' ? 'TIMEOUT_RESET' : 'IDLE';
    this.deviceControl.watchdogRemainingSec = 10;
    this.deviceControl.isLockedOutSpeed = false;
    this.gaugeSweepProgress = 0;

    // Turn off bulb check overrides
    this.dicState.icons = {
      checkEngine: false,
      abs: false,
      tractionControl: false,
      oilPressure: false,
      batteryLow: false,
      airbag: false,
      highBeam: false,
      doorAjar: false,
      tpmsWarning: false,
      seatbelt: false,
      security: false,
    };
  }
}
