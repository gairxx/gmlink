/**
 * GMLAN Diagnostic Services (ISO 14229 / UDS extensions & GM Manufacturer Specific)
 * Covers: Mode $AE (DeviceControl), Mode $06 Onboard Monitor Engine, DPIDs,
 * Node Discovery (0x100-0x102), DTC with Symptom Bytes, Seed/Key 0x27, and Bus Management 0x28.
 */

import { CanFrame, DeviceControlRoutine, DpidGroup, GmDtc, GmlanNode, Mode06TestResult } from './types';

export enum UdsServiceId {
  DIAGNOSTIC_SESSION_CONTROL = 0x10,
  ECU_RESET = 0x11,
  CLEAR_DIAGNOSTIC_INFORMATION = 0x14,
  READ_DTC_INFORMATION = 0x19,
  READ_DATA_BY_IDENTIFIER = 0x22,
  READ_MEMORY_BY_ADDRESS = 0x23,
  SECURITY_ACCESS = 0x27,
  COMMUNICATION_CONTROL = 0x28, // DisableNormalCommunicationAllNodes
  DYNAMICALLY_DEFINE_DATA_IDENTIFIER = 0x2c, // DPID
  WRITE_DATA_BY_IDENTIFIER = 0x2e,
  INPUT_OUTPUT_CONTROL_BY_ID = 0x2f, // UDS Device Control / GMLAN Mode $AE
  WRITE_MEMORY_BY_ADDRESS = 0x3d,
  TESTER_PRESENT = 0x3e,
  MODE_06_ONBOARD_MONITOR = 0x06,
  GMLAN_DEVICE_CONTROL = 0xae, // GM Mode $AE
}

/**
 * GM Mode $06 UASID (Unit and Scaling ID) translation table
 */
export interface UasidSpec {
  uasid: number;
  unit: string;
  scaling: number;
  offset: number;
  formatDecimals: number;
}

export const GM_UASID_TABLE: Record<number, UasidSpec> = {
  0x01: { uasid: 0x01, unit: 'ratio', scaling: 0.0000305175, offset: 0, formatDecimals: 4 },
  0x04: { uasid: 0x04, unit: 'mV', scaling: 1, offset: 0, formatDecimals: 0 },
  0x07: { uasid: 0x07, unit: 'V', scaling: 0.001, offset: 0, formatDecimals: 3 },
  0x0b: { uasid: 0x0b, unit: 'ms', scaling: 1, offset: 0, formatDecimals: 0 },
  0x0e: { uasid: 0x0e, unit: 'Hz', scaling: 1, offset: 0, formatDecimals: 1 },
  0x14: { uasid: 0x14, unit: 'counts', scaling: 1, offset: 0, formatDecimals: 0 },
  0x19: { uasid: 0x19, unit: 'kPa', scaling: 0.01, offset: 0, formatDecimals: 2 },
  0x1a: { uasid: 0x1a, unit: 'Pa', scaling: 0.25, offset: 0, formatDecimals: 1 },
  0x20: { uasid: 0x20, unit: '°C', scaling: 0.1, offset: -40, formatDecimals: 1 },
  0x22: { uasid: 0x22, unit: 'Ω', scaling: 1, offset: 0, formatDecimals: 1 },
  0x30: { uasid: 0x30, unit: '%', scaling: 0.0015258789, offset: 0, formatDecimals: 2 },
};

/**
 * Standard Mode $06 Tests implemented for GM Powertrain
 */
export const GM_MODE06_PRESETS: Mode06TestResult[] = [
  {
    mid: 0x01,
    tid: 0x01,
    midName: 'O2 Sensor Monitor Bank 1 Sensor 1',
    tidName: 'Rich to Lean Switch Time',
    uasid: 0x0b,
    unit: 'ms',
    testValueRaw: 68,
    testValueFormatted: '68 ms',
    minLimitFormatted: '15 ms',
    maxLimitFormatted: '120 ms',
    status: 'PASS',
    description: 'Upstream oxygen sensor dynamic response time evaluation.',
  },
  {
    mid: 0x02,
    tid: 0x02,
    midName: 'O2 Sensor Monitor Bank 1 Sensor 2',
    tidName: 'Downstream Oxygen Sensor Min Voltage',
    uasid: 0x04,
    unit: 'mV',
    testValueRaw: 460,
    testValueFormatted: '460 mV',
    minLimitFormatted: '100 mV',
    maxLimitFormatted: '900 mV',
    status: 'PASS',
    description: 'Post-catalytic converter oxygen sensor voltage swing evaluation.',
  },
  {
    mid: 0x21,
    tid: 0xa2,
    midName: 'Catalyst Monitor Bank 1',
    tidName: 'Conversion Efficiency Threshold Ratio',
    uasid: 0x01,
    unit: 'ratio',
    testValueRaw: 4200,
    testValueFormatted: '0.1281 ratio',
    minLimitFormatted: '0.0000 ratio',
    maxLimitFormatted: '0.6500 ratio',
    status: 'PASS',
    description: 'Three-way catalytic converter hydrocarbon and NOx oxidation performance.',
  },
  {
    mid: 0x35,
    tid: 0x11,
    midName: 'EVAP System (0.020" Leak Detection)',
    tidName: 'Pressure Decay Gradient under Vacuum',
    uasid: 0x1a,
    unit: 'Pa',
    testValueRaw: 72,
    testValueFormatted: '18.0 Pa',
    minLimitFormatted: '0.0 Pa',
    maxLimitFormatted: '45.0 Pa',
    status: 'PASS',
    description: 'Fuel tank evaporative emission gross and fine leak detection decay.',
  },
  {
    mid: 0x36,
    tid: 0x12,
    midName: 'EVAP Purge Solenoid Integrity',
    tidName: 'Purge Flow Rate & Fuel Trim Deviation',
    uasid: 0x30,
    unit: '%',
    testValueRaw: 1800,
    testValueFormatted: '2.74 %',
    minLimitFormatted: '-8.00 %',
    maxLimitFormatted: '+8.00 %',
    status: 'PASS',
    description: 'Canister purge valve duty-cycle vacuum draw validation.',
  },
  {
    mid: 0xa1,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 1',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa2,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 2',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 1,
    testValueFormatted: '1 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa3,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 3',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa4,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 4',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa5,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 5',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa6,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 6',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 2,
    testValueFormatted: '2 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa7,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 7',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
  {
    mid: 0xa8,
    tid: 0x0c,
    midName: 'Misfire Monitor Cylinder 8',
    tidName: 'Weighted Crankshaft Acceleration Drop',
    uasid: 0x14,
    unit: 'counts',
    testValueRaw: 0,
    testValueFormatted: '0 counts',
    minLimitFormatted: '0 counts',
    maxLimitFormatted: '15 counts',
    status: 'PASS',
    description: 'Real-time 1,000 revolution misfire revolution deviation counter.',
  },
];

/**
 * GMLAN Discovered Modules Network Topology
 */
export const GMLAN_KNOWN_NODES: GmlanNode[] = [
  {
    nodeId: 0x10,
    name: 'ECM',
    longName: 'Engine Control Module',
    category: 'POWERTRAIN',
    bus: 'HS_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x18,
    name: 'TCM',
    longName: 'Transmission Control Module',
    category: 'POWERTRAIN',
    bus: 'HS_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x28,
    name: 'EBCM',
    longName: 'Electronic Brake Control Module (ABS/ESC)',
    category: 'CHASSIS',
    bus: 'HS_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x40,
    name: 'BCM',
    longName: 'Body Control Module',
    category: 'BODY',
    bus: 'SW_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x50,
    name: 'SDM',
    longName: 'Sensing & Diagnostic Module (Airbags)',
    category: 'CHASSIS',
    bus: 'HS_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x58,
    name: 'HVAC',
    longName: 'Climate Control Module',
    category: 'BODY',
    bus: 'SW_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x60,
    name: 'IPC',
    longName: 'Instrument Panel Cluster & DIC',
    category: 'CLUSTER_INFOTAINMENT',
    bus: 'SW_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0x80,
    name: 'RADIO/DIC',
    longName: 'Infotainment & Telematics Gateway',
    category: 'CLUSTER_INFOTAINMENT',
    bus: 'SW_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
  {
    nodeId: 0xa0,
    name: 'RFA',
    longName: 'Remote Function Actuator (Keyless Entry)',
    category: 'BODY',
    bus: 'SW_CAN',
    lastHeartbeatMs: Date.now(),
    isOnline: true,
  },
];

/**
 * Diagnostic Trouble Codes Catalog with 2-character GM Symptom Bytes
 */
export const SAMPLE_GM_DTCS: GmDtc[] = [
  {
    code: 'P0171',
    symptomByte: '00',
    symptomCategory: 'General / No Subtype',
    symptomDescription: 'No additional sub-type information',
    faultDescription: 'Fuel Trim System Lean (Bank 1)',
    ecu: 'ECM (0x10)',
    status: 'ACTIVE',
  },
  {
    code: 'B1000',
    symptomByte: '00',
    symptomCategory: 'General Electronic',
    symptomDescription: 'ECU Internal Memory / Processor Fault',
    faultDescription: 'Electronic Control Unit Performance Check',
    ecu: 'BCM (0x40)',
    status: 'HISTORY',
  },
  {
    code: 'C0035',
    symptomByte: '02',
    symptomCategory: 'General Electrical (Category 0/1)',
    symptomDescription: 'Short to Ground',
    faultDescription: 'Left Front Wheel Speed Sensor Circuit Low',
    ecu: 'EBCM (0x28)',
    status: 'ACTIVE',
  },
  {
    code: 'U0100',
    symptomByte: '71',
    symptomCategory: 'Bus / Invalid Serial Data (Category 7)',
    symptomDescription: 'Invalid Data Received from ECM',
    faultDescription: 'Lost Communication With Engine Control Module',
    ecu: 'IPC (0x60)',
    status: 'ACTIVE',
  },
  {
    code: 'P0442',
    symptomByte: '00',
    symptomCategory: 'General / Emission',
    symptomDescription: 'Small Leak Detected (0.040")',
    faultDescription: 'Evaporative Emission Control System Leak Detected',
    ecu: 'ECM (0x10)',
    status: 'PENDING',
  },
];

/**
 * Default Dynamic Data Packet Identifier (DPID) Configurations
 */
export const DEFAULT_DPID_GROUPS: DpidGroup[] = [
  {
    dpid: 0xfe,
    name: 'High-Speed Powertrain Packet',
    transmissionRateHz: 50,
    isActive: true,
    pids: [
      { pid: 0x0c, name: 'Engine RPM', byteCount: 2 },
      { pid: 0x0d, name: 'Vehicle Speed', byteCount: 1 },
      { pid: 0x11, name: 'Throttle Position', byteCount: 1 },
      { pid: 0x05, name: 'Engine Coolant Temp', byteCount: 1 },
      { pid: 0x04, name: 'Calculated Engine Load', byteCount: 1 },
    ],
  },
  {
    dpid: 0xfd,
    name: 'Chassis Dynamics Packet',
    transmissionRateHz: 20,
    isActive: false,
    pids: [
      { pid: 0x5b, name: 'Steering Wheel Angle', byteCount: 2 },
      { pid: 0x28, name: 'Wheel Speed Front Left', byteCount: 2 },
      { pid: 0x29, name: 'Wheel Speed Front Right', byteCount: 2 },
      { pid: 0x43, name: 'Brake Line Pressure', byteCount: 2 },
    ],
  },
];

/**
 * GM Seed/Key Algorithm Scaffolding (ISO 14229 Service 0x27)
 * Implements standard polynomial transformation used on GMLAN ECUs (e.g., E38/E67 ECMs)
 */
export function calculateGmSecurityKey(seed: number, accessLevel: number = 1): number {
  // Classic GM 16-bit LFSR / polynomial hash simulation
  let key = seed ^ 0x485a; // GM default mask constant
  if (accessLevel === 1) {
    key = ((key << 3) & 0xffff) | ((key >> 13) & 0x07);
    key = key ^ 0xa55a;
  } else {
    key = ((key << 5) & 0xffff) | ((key >> 11) & 0x1f);
    key = key ^ 0x5aa5;
  }
  return key & 0xffff;
}

/**
 * Format GM Diagnostic Frame for Mode $AE DeviceControl (or UDS 0x2F)
 */
export function createDeviceControlFrame(
  routine: DeviceControlRoutine,
  subCommand: number = 0x03, // 0x03 = ShortTermAdjustment / Active Control
  param1: number = 0x00,
  param2: number = 0x00
): CanFrame {
  const routineCodes: Record<DeviceControlRoutine, number> = {
    GAUGE_SWEEP: 0x01,
    BULB_CHECK: 0x02,
    ABS_BLEED: 0x03,
    EVAP_PURGE_VENT: 0x04,
    FUEL_PUMP_PRIME: 0x05,
    COOLING_FAN_LOW: 0x06,
    COOLING_FAN_HIGH: 0x07,
    CYLINDER_CUTOUT: 0x10,
    RETURN_TO_NORMAL: 0x20, // 0x20 = ReturnControlToECU
  };

  const code = routineCodes[routine] ?? 0x20;
  const isReturn = routine === 'RETURN_TO_NORMAL';
  const controlByte = isReturn ? 0x20 : subCommand; // 0x20=ReturnControl

  // Target ECM 0x7E0 or BCM 0x241
  const targetId = (routine === 'GAUGE_SWEEP' || routine === 'BULB_CHECK') ? 0x241 : 0x7e0;

  return {
    id: targetId,
    isExtended: false,
    bus: targetId === 0x241 ? 'SW_CAN' : 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [
      0x05, // Length = 5 bytes
      UdsServiceId.GMLAN_DEVICE_CONTROL,
      code,
      controlByte,
      param1,
      param2,
      0xaa,
      0xaa,
    ],
  };
}

/**
 * Create TesterPresent frame (Service 0x3E)
 */
export function createTesterPresentFrame(suppressResponse: boolean = false): CanFrame {
  const subFunc = suppressResponse ? 0x80 : 0x00;
  return {
    id: 0x7df, // Functional Broadcast ID to all ECUs
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [0x02, UdsServiceId.TESTER_PRESENT, subFunc, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
  };
}

/**
 * Create DisableNormalCommunicationAllNodes frame (Service 0x28)
 */
export function createDisableNormalCommunicationFrame(disable: boolean = true): CanFrame {
  const subFunction = disable ? 0x01 : 0x00; // 0x01 = DisableRxAndTx, 0x00 = EnableRxAndTx
  const commType = 0x01; // Normal Communication Messages
  return {
    id: 0x7df,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [0x03, UdsServiceId.COMMUNICATION_CONTROL, subFunction, commType, 0xaa, 0xaa, 0xaa, 0xaa],
  };
}

/**
 * Create Diagnostic Session Control frame (Service 0x10)
 */
export function createDiagnosticSessionFrame(sessionType: 0x01 | 0x02 | 0x03 | 0x40): CanFrame {
  return {
    id: 0x7e0,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [0x02, UdsServiceId.DIAGNOSTIC_SESSION_CONTROL, sessionType, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
  };
}

/**
 * Create Security Access Seed Request frame (Service 0x27 Subfunction 0x01)
 */
export function createSecurityAccessSeedRequest(level: number = 0x01): CanFrame {
  return {
    id: 0x7e0,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [0x02, UdsServiceId.SECURITY_ACCESS, level, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
  };
}

/**
 * Create Security Access Key Send frame (Service 0x27 Subfunction 0x02)
 */
export function createSecurityAccessKeySend(key: number, level: number = 0x02): CanFrame {
  const keyHigh = (key >> 8) & 0xff;
  const keyLow = key & 0xff;
  return {
    id: 0x7e0,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [0x04, UdsServiceId.SECURITY_ACCESS, level, keyHigh, keyLow, 0xaa, 0xaa, 0xaa],
  };
}
