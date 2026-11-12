/**
 * GMLAN / OBD-II Protocol Types & Architectural Schema
 * Source of Truth: GMLAN Bible & GM Diagnostic Specification
 */

export type BusType = 'SW_CAN' | 'HS_CAN';

export type AdapterChipset = 'STN_OBDLINK' | 'ELM327' | 'MCP2515' | 'VIRTUAL_SIM';

export type FrameDirection = 'RX' | 'TX';

/**
 * Standard 11-bit or Extended 29-bit CAN Frame
 */
export interface CanFrame {
  id: number;
  isExtended: boolean;
  priority?: number;        // bits 28-26 of 29-bit extended ID
  arbitrationId?: number;   // bits 25-13
  targetEcu?: number;       // bits 12-5 or target node
  sourceEcu?: number;       // bits 4-0 or source node
  data: number[];           // 0 to 8 bytes payload
  dlc: number;
  timestamp: number;        // Epoch millis
  bus: BusType;
  direction: FrameDirection;
}

/**
 * DIC Warning / Status Icons (Message 0x182 Arb_Text_Req_Set_Disp_Icon)
 */
export interface DicIcons {
  checkEngine: boolean;
  abs: boolean;
  tractionControl: boolean;
  oilPressure: boolean;
  batteryLow: boolean;
  airbag: boolean;
  highBeam: boolean;
  doorAjar: boolean;
  tpmsWarning: boolean;
  seatbelt: boolean;
  security: boolean;
}

/**
 * DIC Display Text Configuration (0x185 & 0x186)
 */
export interface DicDisplayState {
  line1: string;
  line2: string;
  displayMode: 'NORMAL' | 'FLASH' | 'SCROLL' | 'PRIORITY_POPUP';
  scrollSpeedMs: number;
  timeoutSec: number;
  icons: DicIcons;
}

/**
 * Chime Command Trigger (0x00F & 0x045)
 */
export interface ChimeCommand {
  toneType: 'REMINDER' | 'WARNING' | 'CRITICAL' | 'KEY_IN_IGNITION' | 'SEATBELT';
  volume: 'LOW' | 'MEDIUM' | 'HIGH';
  repeatCount: number;
  durationMs: number;
}

/**
 * RFA Keyless Entry Emulation (0x004)
 */
export type RfaFunction = 'LOCK' | 'UNLOCK' | 'TRUNK_RELEASE' | 'PANIC' | 'REMOTE_START' | 'IDLE';

/**
 * Lighting & Lock Customization (0x020)
 */
export interface LightingLockConfig {
  headlightDelaySec: 0 | 15 | 30 | 60;
  perimeterLighting: boolean;
  domeLightOverride: boolean;
  autoDoorLock: 'OFF' | 'SHIFT_FROM_PARK' | 'SPEED_SENSITIVE';
  autoDoorUnlock: 'OFF' | 'PARK' | 'KEY_OFF';
}

/**
 * Climate Control HVAC Status (0x064, 0x071-0x075)
 */
export interface HvacStatus {
  fanSpeed: number;           // 0 to 8
  acClutchEngaged: boolean;
  defrostActive: boolean;
  recirculation: boolean;
  driverTempSettingF: number; // 60 to 90 F
  passTempSettingF: number;   // 60 to 90 F
  airFlowMode: 'PANEL' | 'BI_LEVEL' | 'FLOOR' | 'DEFOG' | 'DEFROST';
  rearDefrostActive: boolean;
}

/**
 * TPMS Individual Wheel Status (0x005)
 */
export interface WheelTpms {
  psi: number;
  kpa: number;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'SENSOR_FAULT';
  sensorBatteryOk: boolean;
}

export interface TpmsState {
  frontLeft: WheelTpms;
  frontRight: WheelTpms;
  rearLeft: WheelTpms;
  rearRight: WheelTpms;
}

/**
 * High-Speed & Low-Speed Live Telemetry Store
 */
export interface VehicleTelemetry {
  engineRpm: number;              // 0x0C9 (0 - 8000 RPM)
  vehicleSpeedMph: number;        // 0x028 / 0x3E9 (0 - 160 MPH)
  vehicleSpeedKmh: number;
  brakePedalPressed: boolean;     // 0x0C9
  brakePositionPct: number;       // 0 - 100%
  throttlePositionPct: number;    // 0 - 100%
  busVoltage12V: number;          // 0x018 (e.g. 13.8V - 14.4V)
  steeringWheelAngleDeg: number;  // 0x05B (-720° to +720°)
  steeringRateDegSec: number;     // 0x05B (deg/sec)
  outsideAirTempC: number;        // 0x061 (-40°C to +85°C)
  outsideAirTempF: number;
  steeringWheelButtons: {         // 0x068
    volumeUp: boolean;
    volumeDown: boolean;
    seekNext: boolean;
    seekPrev: boolean;
    voiceTrigger: boolean;
    mute: boolean;
  };
  tpms: TpmsState;                // 0x005
  hvac: HvacStatus;               // 0x064
  dic: DicDisplayState;           // 0x182, 0x185, 0x186
  gear: 'P' | 'R' | 'N' | 'D' | 'M';
  doorsLocked: boolean;
  engineRunning: boolean;
}

/**
 * GM Mode $AE / UDS 0x2F Device Control & Actuator Overrides
 */
export type DeviceControlRoutine =
  | 'GAUGE_SWEEP'
  | 'BULB_CHECK'
  | 'ABS_BLEED'
  | 'EVAP_PURGE_VENT'
  | 'FUEL_PUMP_PRIME'
  | 'COOLING_FAN_LOW'
  | 'COOLING_FAN_HIGH'
  | 'CYLINDER_CUTOUT'
  | 'RETURN_TO_NORMAL';

export interface DeviceControlStatus {
  activeRoutine: DeviceControlRoutine | null;
  cylCutoutNumber?: number; // 1 - 8
  watchdogRemainingSec: number;
  isLockedOutSpeed: boolean; // True if vehicle speed > 0
  lastCommandSent: string;
  responseState: 'IDLE' | 'ACTIVE' | 'COMPLETED' | 'REJECTED_SPEED_LOCKOUT' | 'TIMEOUT_RESET';
}

/**
 * OBD Mode $06 Onboard Monitor Test Definition
 */
export interface Mode06TestResult {
  mid: number;             // Monitor ID (e.g., $01 Exhaust Gas Sensor, $21 Catalyst)
  tid: number;             // Test ID (e.g., $01 Rich to Lean response time)
  midName: string;
  tidName: string;
  uasid: number;           // Unit & Scaling ID
  unit: string;
  testValueRaw: number;
  testValueFormatted: string;
  minLimitFormatted: string;
  maxLimitFormatted: string;
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  description: string;
}

/**
 * Dynamic Data Packet Identifier (DPID) Group
 */
export interface DpidGroup {
  dpid: number;            // e.g. 0xFE, 0xFD
  name: string;
  pids: { pid: number; name: string; byteCount: number }[];
  transmissionRateHz: number;
  isActive: boolean;
}

/**
 * GMLAN Discovered ECU Node
 */
export interface GmlanNode {
  nodeId: number;          // e.g. 0x10 ECM, 0x18 TCM, 0x40 BCM, 0x28 EBCM
  name: string;
  longName: string;
  category: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'CLUSTER_INFOTAINMENT';
  bus: BusType;
  lastHeartbeatMs: number;
  isOnline: boolean;
}

/**
 * GM Diagnostic Trouble Code (DTC) with 2-character Symptom Byte
 */
export interface GmDtc {
  code: string;            // e.g. "P0300"
  symptomByte: string;     // e.g. "00", "02", "03", "1A", "71"
  symptomCategory: string; // e.g. "General Electrical", "PWM Failure", "Invalid Serial Data"
  symptomDescription: string;
  faultDescription: string;
  ecu: string;
  status: 'ACTIVE' | 'HISTORY' | 'PENDING';
}

/**
 * Safety & Fail-Safe Architecture State
 */
export interface SafetyState {
  listenOnlyMode: boolean;       // ATMA default: no TX without explicit user unlock
  speedLockoutActive: boolean;    // Inhibit dangerous actuators when speed > 0 km/h
  watchdogTimerMs: number;       // Auto ReturnToNormalMode timer (10,000 ms)
  txBufferOverflow: boolean;
  busOffDetected: boolean;
  ackFailures: number;
}
