/**
 * GMLAN Message Catalog, Encoding, Decoding, and Engineering Unit Transformations
 * Source of Truth: GMLAN Bible & GM OBD-II CAN Specifications
 */

import {
  BusType,
  CanFrame,
  ChimeCommand,
  DicDisplayState,
  DicIcons,
  HvacStatus,
  RfaFunction,
  TpmsState,
  VehicleTelemetry,
} from './types';

export interface MessageSpec {
  id: number;
  hexId: string;
  name: string;
  bus: BusType;
  dlc: number;
  periodMs: number;
  senderEcu: string;
  receiverEcus: string[];
  description: string;
  byteLayout: {
    byteIndex: number;
    bitRange?: string;
    field: string;
    type: string;
    scaling: string;
    units: string;
  }[];
}

/**
 * Authoritative GMLAN Message Catalog
 */
export const GMLAN_MESSAGE_CATALOG: Record<number, MessageSpec> = {
  0x0C9: {
    id: 0x0C9,
    hexId: '0x0C9',
    name: 'Engine_General_Status_1',
    bus: 'HS_CAN',
    dlc: 8,
    periodMs: 20,
    senderEcu: 'ECM (0x10)',
    receiverEcus: ['TCM', 'BCM', 'IPC', 'EBCM'],
    description: 'Powertrain primary broadcast: Engine RPM, Brake Switch, Throttle Position',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Engine Run Flag & Brake Switch', type: 'Bitfield', scaling: 'bit0=Brake, bit2=Run', units: 'Flags' },
      { byteIndex: 1, bitRange: '7:0', field: 'Engine Speed (RPM) High Byte', type: 'uint16', scaling: 'Raw * 0.25', units: 'RPM' },
      { byteIndex: 2, bitRange: '7:0', field: 'Engine Speed (RPM) Low Byte', type: 'uint16', scaling: 'Raw * 0.25', units: 'RPM' },
      { byteIndex: 3, bitRange: '7:0', field: 'Throttle Position %', type: 'uint8', scaling: 'Raw * 100 / 255', units: '%' },
      { byteIndex: 4, bitRange: '7:0', field: 'Engine Coolant Temp', type: 'int8', scaling: 'Raw - 40', units: '°C' },
      { byteIndex: 5, bitRange: '7:0', field: 'Engine Torque Actual', type: 'uint8', scaling: 'Raw * 0.5', units: '%' },
      { byteIndex: 6, bitRange: '7:0', field: 'Brake Position Sensor', type: 'uint8', scaling: 'Raw * 100 / 255', units: '%' },
      { byteIndex: 7, bitRange: '7:0', field: 'Rolling Counter & Checksum', type: 'uint8', scaling: 'CRC-8 / Counter', units: 'Counts' },
    ],
  },
  0x028: {
    id: 0x028,
    hexId: '0x028',
    name: 'Vehicle_Speed_Information (VSS)',
    bus: 'SW_CAN',
    dlc: 4,
    periodMs: 50,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['IPC', 'Radio/DIC', 'HVAC'],
    description: 'Vehicle speed transmitted to cluster, DIC, and body modules',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Vehicle Speed High Byte', type: 'uint16', scaling: 'Raw * 0.01', units: 'mph' },
      { byteIndex: 1, bitRange: '7:0', field: 'Vehicle Speed Low Byte', type: 'uint16', scaling: 'Raw * 0.01', units: 'mph' },
      { byteIndex: 2, bitRange: '7:0', field: 'Cruise Control Active Flag', type: 'uint8', scaling: 'Bitmask 0x01', units: 'Boolean' },
      { byteIndex: 3, bitRange: '7:0', field: 'Transmission PRNDL State', type: 'uint8', scaling: 'Enum P/R/N/D', units: 'Enum' },
    ],
  },
  0x018: {
    id: 0x018,
    hexId: '0x018',
    name: 'Electrical_Power_Management_Status',
    bus: 'SW_CAN',
    dlc: 2,
    periodMs: 500,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['IPC', 'ECM'],
    description: '12V vehicle battery & alternator bus voltage telemetry',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: '12V Bus Voltage', type: 'uint8', scaling: 'Raw * 0.0625 + 5.0', units: 'Volts (V)' },
      { byteIndex: 1, bitRange: '7:0', field: 'Regulated Voltage Control Status', type: 'uint8', scaling: 'Mode Enum', units: 'State' },
    ],
  },
  0x05B: {
    id: 0x05B,
    hexId: '0x05B',
    name: 'Steering_Wheel_Angle_Sensor',
    bus: 'HS_CAN',
    dlc: 5,
    periodMs: 10,
    senderEcu: 'SWAS / EBCM (0x28)',
    receiverEcus: ['EBCM', 'ECM', 'BCM'],
    description: 'Steering wheel angle position and rate of turn for StabiliTrak / ESC',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Steering Angle High Byte', type: 'int16', scaling: '(Raw - 0x8000) * 0.0625', units: 'Deg (°)' },
      { byteIndex: 1, bitRange: '7:0', field: 'Steering Angle Low Byte', type: 'int16', scaling: '(Raw - 0x8000) * 0.0625', units: 'Deg (°)' },
      { byteIndex: 2, bitRange: '7:0', field: 'Steering Rate of Turn', type: 'int8', scaling: 'Raw * 4.0', units: 'Deg/Sec' },
      { byteIndex: 3, bitRange: '7:0', field: 'Sensor Calibration Status', type: 'uint8', scaling: 'Bit 0=Calibrated', units: 'Flags' },
      { byteIndex: 4, bitRange: '7:0', field: 'Rolling Counter', type: 'uint8', scaling: '0-15', units: 'Counts' },
    ],
  },
  0x061: {
    id: 0x061,
    hexId: '0x061',
    name: 'Outside_Air_Temperature_Sensor',
    bus: 'SW_CAN',
    dlc: 2,
    periodMs: 1000,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['IPC', 'HVAC', 'Radio/DIC'],
    description: 'Ambient outside temperature filtered reading for DIC & climate control',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Ambient Temp Raw', type: 'uint8', scaling: 'Raw * 0.5 - 40', units: '°C' },
      { byteIndex: 1, bitRange: '7:0', field: 'Filtered Status & Mask', type: 'uint8', scaling: 'Bit 7=Valid', units: 'Flags' },
    ],
  },
  0x068: {
    id: 0x068,
    hexId: '0x068',
    name: 'Steering_Wheel_Controls_Status',
    bus: 'SW_CAN',
    dlc: 3,
    periodMs: 100,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['Radio/DIC', 'IPC'],
    description: 'Steering wheel button switch states (Volume, Seek, Voice PTT, Mute)',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Media Switch Bitfield', type: 'uint8', scaling: 'bit0=Vol+, bit1=Vol-, bit2=Seek+, bit3=Seek-', units: 'Bitmask' },
      { byteIndex: 1, bitRange: '7:0', field: 'Voice & Mute Switch', type: 'uint8', scaling: 'bit0=Voice PTT, bit1=Mute, bit2=Source', units: 'Bitmask' },
      { byteIndex: 2, bitRange: '7:0', field: 'Cruise Switches State', type: 'uint8', scaling: 'bit0=On/Off, bit1=Set, bit2=Resume', units: 'Bitmask' },
    ],
  },
  0x005: {
    id: 0x005,
    hexId: '0x005',
    name: 'Tire_Pressure_Monitoring_System (TPMS)',
    bus: 'SW_CAN',
    dlc: 6,
    periodMs: 2000,
    senderEcu: 'RCDLR / BCM (0x40)',
    receiverEcus: ['IPC', 'DIC'],
    description: 'Individual wheel tire pressures and sensor transmitter status',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Front Left Tire Pressure', type: 'uint8', scaling: 'Raw * 0.25 (PSI)', units: 'PSI' },
      { byteIndex: 1, bitRange: '7:0', field: 'Front Right Tire Pressure', type: 'uint8', scaling: 'Raw * 0.25 (PSI)', units: 'PSI' },
      { byteIndex: 2, bitRange: '7:0', field: 'Rear Left Tire Pressure', type: 'uint8', scaling: 'Raw * 0.25 (PSI)', units: 'PSI' },
      { byteIndex: 3, bitRange: '7:0', field: 'Rear Right Tire Pressure', type: 'uint8', scaling: 'Raw * 0.25 (PSI)', units: 'PSI' },
      { byteIndex: 4, bitRange: '7:0', field: 'Warning Lamp & Low Battery Flags', type: 'uint8', scaling: 'Bitmask', units: 'Flags' },
      { byteIndex: 5, bitRange: '7:0', field: 'Learn Mode Active Flag', type: 'uint8', scaling: 'Bit 0', units: 'Boolean' },
    ],
  },
  0x182: {
    id: 0x182,
    hexId: '0x182',
    name: 'Arb_Text_Req_Set_Disp_Icon',
    bus: 'SW_CAN',
    dlc: 4,
    periodMs: 250,
    senderEcu: 'ECM / BCM / EBCM',
    receiverEcus: ['IPC (0x60)'],
    description: 'DIC and instrument cluster warning lamp/icon state illumination control',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Icon Byte 1: CEL, ABS, Traction, Oil', type: 'Bitfield', scaling: 'b0=CEL, b1=ABS, b2=TRAC, b3=OIL', units: 'Bitmask' },
      { byteIndex: 1, bitRange: '7:0', field: 'Icon Byte 2: Battery, Airbag, HighBeam, Door', type: 'Bitfield', scaling: 'b0=BATT, b1=AIRBAG, b2=HI_BEAM, b3=DOOR', units: 'Bitmask' },
      { byteIndex: 2, bitRange: '7:0', field: 'Icon Byte 3: TPMS Warning, Seatbelt, Security', type: 'Bitfield', scaling: 'b0=TPMS, b1=SEATBELT, b2=SECURITY', units: 'Bitmask' },
      { byteIndex: 3, bitRange: '7:0', field: 'Blink Rate & Priority Override', type: 'uint8', scaling: '0=Steady, 1=Fast, 2=Slow', units: 'Enum' },
    ],
  },
  0x185: {
    id: 0x185,
    hexId: '0x185',
    name: 'ReqSetDispParms',
    bus: 'SW_CAN',
    dlc: 3,
    periodMs: 500,
    senderEcu: 'Radio / BCM',
    receiverEcus: ['IPC / DIC (0x60)'],
    description: 'Text display layout, scrolling parameters, line count, and display duration',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Display Mode & Alignment', type: 'uint8', scaling: '0=Normal, 1=Flash, 2=Scroll, 3=Popup', units: 'Mode' },
      { byteIndex: 1, bitRange: '7:0', field: 'Scroll Speed Interval (ms / 10)', type: 'uint8', scaling: 'Raw * 10 ms', units: 'ms' },
      { byteIndex: 2, bitRange: '7:0', field: 'Display Timeout (Seconds)', type: 'uint8', scaling: 'Raw Seconds', units: 'sec' },
    ],
  },
  0x186: {
    id: 0x186,
    hexId: '0x186',
    name: 'Text_Req_Set_Display',
    bus: 'SW_CAN',
    dlc: 8,
    periodMs: 100,
    senderEcu: 'Radio / BCM / Tester',
    receiverEcus: ['IPC / DIC (0x60)'],
    description: 'ASCII text payload streaming to cluster DIC display lines (multi-frame chunked)',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Line Index & Frame Sequence', type: 'uint8', scaling: 'High Nibble=Line (1-2), Low=Seq', units: 'Control' },
      { byteIndex: 1, bitRange: '7:0', field: 'ASCII Char 0', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 2, bitRange: '7:0', field: 'ASCII Char 1', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 3, bitRange: '7:0', field: 'ASCII Char 2', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 4, bitRange: '7:0', field: 'ASCII Char 3', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 5, bitRange: '7:0', field: 'ASCII Char 4', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 6, bitRange: '7:0', field: 'ASCII Char 5', type: 'char', scaling: 'ASCII', units: 'char' },
      { byteIndex: 7, bitRange: '7:0', field: 'ASCII Char 6', type: 'char', scaling: 'ASCII', units: 'char' },
    ],
  },
  0x00F: {
    id: 0x00F,
    hexId: '0x00F',
    name: 'Chime_Command_Trigger',
    bus: 'SW_CAN',
    dlc: 3,
    periodMs: 250,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['Radio / IPC (Speaker Driver)'],
    description: 'Chime tone trigger, cadence selection, and repetition count',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Chime Tone Code', type: 'uint8', scaling: '1=Reminder, 2=Warning, 3=Critical', units: 'Enum' },
      { byteIndex: 1, bitRange: '7:0', field: 'Repeat Count', type: 'uint8', scaling: '1-10 Beeps', units: 'Counts' },
      { byteIndex: 2, bitRange: '7:0', field: 'Cadence Interval (ms / 10)', type: 'uint8', scaling: 'Raw * 10 ms', units: 'ms' },
    ],
  },
  0x045: {
    id: 0x045,
    hexId: '0x045',
    name: 'Chime_Volume_Level',
    bus: 'SW_CAN',
    dlc: 1,
    periodMs: 1000,
    senderEcu: 'Radio (0x80)',
    receiverEcus: ['BCM', 'IPC'],
    description: 'Chime audio master volume attenuation level setting',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Volume Level', type: 'uint8', scaling: '0=Low (Quiet), 1=Med, 2=Loud', units: 'Level' },
    ],
  },
  0x004: {
    id: 0x004,
    hexId: '0x004',
    name: 'RFA_Functions (Keyless Entry Emulation)',
    bus: 'SW_CAN',
    dlc: 2,
    periodMs: 0, // Event driven burst
    senderEcu: 'RCDLR / Remote Receiver',
    receiverEcus: ['BCM (0x40)'],
    description: 'Remote keyless entry emulation: lock, unlock, trunk, panic, remote start',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Key Fob Command', type: 'uint8', scaling: '0x01=Lock, 0x02=Unlock, 0x04=Trunk, 0x08=Panic, 0x10=Start', units: 'Enum' },
      { byteIndex: 1, bitRange: '7:0', field: 'Fob Number & Sequence', type: 'uint8', scaling: 'Fob 1-4', units: 'ID' },
    ],
  },
  0x020: {
    id: 0x020,
    hexId: '0x020',
    name: 'Light_And_Lock_Customization_Req',
    bus: 'SW_CAN',
    dlc: 4,
    periodMs: 1000,
    senderEcu: 'DIC / Radio (0x80)',
    receiverEcus: ['BCM (0x40)'],
    description: 'Lighting delay, perimeter illumination, and auto door locking customization preferences',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Exit Lighting Delay (sec)', type: 'uint8', scaling: '0, 15, 30, 60 sec', units: 'sec' },
      { byteIndex: 1, bitRange: '7:0', field: 'Perimeter Lighting Active', type: 'uint8', scaling: '0=Off, 1=On', units: 'Boolean' },
      { byteIndex: 2, bitRange: '7:0', field: 'Auto Door Lock Mode', type: 'uint8', scaling: '0=Off, 1=Shift from Park, 2=Speed Sensitive', units: 'Enum' },
      { byteIndex: 3, bitRange: '7:0', field: 'Auto Door Unlock Mode', type: 'uint8', scaling: '0=Off, 1=In Park, 2=At Key Off', units: 'Enum' },
    ],
  },
  0x064: {
    id: 0x064,
    hexId: '0x064',
    name: 'Climate_Control_General_Status_2',
    bus: 'SW_CAN',
    dlc: 5,
    periodMs: 200,
    senderEcu: 'HVAC Control Module (0x58)',
    receiverEcus: ['BCM', 'Radio/DIC'],
    description: 'HVAC system running status: blower speed, AC clutch, air distribution, defrost',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Fan Blower Speed (0-8)', type: 'uint8', scaling: '0=Off, 1-8=Speeds', units: 'Level' },
      { byteIndex: 1, bitRange: '7:0', field: 'HVAC Flags (AC, Defrost, Recirc)', type: 'Bitfield', scaling: 'b0=AC, b1=Defrost, b2=Recirc, b3=RearDefrost', units: 'Bitmask' },
      { byteIndex: 2, bitRange: '7:0', field: 'Air Delivery Mode', type: 'uint8', scaling: '0=Panel, 1=Bi-Level, 2=Floor, 3=Defog, 4=Defrost', units: 'Mode' },
      { byteIndex: 3, bitRange: '7:0', field: 'Driver Set Temp (°F)', type: 'uint8', scaling: '60 - 90 °F (60=Low, 90=High)', units: '°F' },
      { byteIndex: 4, bitRange: '7:0', field: 'Passenger Set Temp (°F)', type: 'uint8', scaling: '60 - 90 °F', units: '°F' },
    ],
  },
  0x071: {
    id: 0x071,
    hexId: '0x071',
    name: 'HVAC_Button_Presses_1',
    bus: 'SW_CAN',
    dlc: 3,
    periodMs: 100,
    senderEcu: 'HVAC Faceplate',
    receiverEcus: ['HVAC (0x58)'],
    description: 'Button presses: Auto, Off, AC toggle, Defrost button, Recirc toggle',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Button Event Mask 1', type: 'uint8', scaling: 'b0=AC, b1=Auto, b2=Off, b3=Recirc', units: 'Bitmask' },
      { byteIndex: 1, bitRange: '7:0', field: 'Button Event Mask 2', type: 'uint8', scaling: 'b0=FrontDefrost, b1=RearDefrost', units: 'Bitmask' },
      { byteIndex: 2, bitRange: '7:0', field: 'Fan Speed Stepper Delta', type: 'int8', scaling: '-1=Down, +1=Up', units: 'Delta' },
    ],
  },
  0x072: {
    id: 0x072,
    hexId: '0x072',
    name: 'HVAC_Temperature_Dial_Inputs',
    bus: 'SW_CAN',
    dlc: 2,
    periodMs: 100,
    senderEcu: 'HVAC Faceplate',
    receiverEcus: ['HVAC (0x58)'],
    description: 'Dual-zone rotary encoder dial positions for driver and passenger temperature',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Driver Temp Rotary Position', type: 'uint8', scaling: 'Absolute 60-90°F', units: '°F' },
      { byteIndex: 1, bitRange: '7:0', field: 'Passenger Temp Rotary Position', type: 'uint8', scaling: 'Absolute 60-90°F', units: '°F' },
    ],
  },
  0x073: {
    id: 0x073,
    hexId: '0x073',
    name: 'HVAC_Air_Delivery_Selector',
    bus: 'SW_CAN',
    dlc: 2,
    periodMs: 100,
    senderEcu: 'HVAC Faceplate',
    receiverEcus: ['HVAC (0x58)'],
    description: 'Air delivery mode selector (Vent, Floor, Defog, Mix)',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Mode Selection', type: 'uint8', scaling: '0=Vent, 1=BiLevel, 2=Floor, 3=Defog', units: 'Mode' },
      { byteIndex: 1, bitRange: '7:0', field: 'Dual Zone Sync State', type: 'uint8', scaling: '0=Independent, 1=Synced', units: 'Boolean' },
    ],
  },
  0x075: {
    id: 0x075,
    hexId: '0x075',
    name: 'HVAC_Extended_Status',
    bus: 'SW_CAN',
    dlc: 4,
    periodMs: 500,
    senderEcu: 'HVAC (0x58)',
    receiverEcus: ['ECM', 'BCM'],
    description: 'Extended HVAC parameters: evaporator core temp, cabin humidity, sunload sensor',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Evaporator Temperature (°C)', type: 'int8', scaling: 'Raw - 40', units: '°C' },
      { byteIndex: 1, bitRange: '7:0', field: 'Cabin Interior Temp (°C)', type: 'int8', scaling: 'Raw - 40', units: '°C' },
      { byteIndex: 2, bitRange: '7:0', field: 'Cabin Relative Humidity %', type: 'uint8', scaling: 'Raw * 0.5', units: '%' },
      { byteIndex: 3, bitRange: '7:0', field: 'Solar Radiation Sunload', type: 'uint8', scaling: 'Raw W/m²', units: 'W/m²' },
    ],
  },
  0x3E9: {
    id: 0x3E9,
    hexId: '0x3E9',
    name: 'Powertrain_Speed_And_Distance',
    bus: 'HS_CAN',
    dlc: 6,
    periodMs: 25,
    senderEcu: 'TCM (0x18)',
    receiverEcus: ['ECM', 'EBCM', 'IPC'],
    description: 'High-precision transmission output shaft speed and vehicle odometer pulse',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Transmission Output Shaft RPM High', type: 'uint16', scaling: 'Raw * 0.5', units: 'RPM' },
      { byteIndex: 1, bitRange: '7:0', field: 'Transmission Output Shaft RPM Low', type: 'uint16', scaling: 'Raw * 0.5', units: 'RPM' },
      { byteIndex: 2, bitRange: '7:0', field: 'Vehicle Speed High Byte (km/h)', type: 'uint16', scaling: 'Raw * 0.01', units: 'km/h' },
      { byteIndex: 3, bitRange: '7:0', field: 'Vehicle Speed Low Byte (km/h)', type: 'uint16', scaling: 'Raw * 0.01', units: 'km/h' },
      { byteIndex: 4, bitRange: '7:0', field: 'Gear Ratio Actual', type: 'uint8', scaling: 'Raw * 0.05', units: 'Ratio' },
      { byteIndex: 5, bitRange: '7:0', field: 'Torque Converter Clutch Slip', type: 'int8', scaling: 'Raw RPM', units: 'RPM' },
    ],
  },
  0x100: {
    id: 0x100,
    hexId: '0x100',
    name: 'GMLAN_Node_Status_Powertrain',
    bus: 'HS_CAN',
    dlc: 1,
    periodMs: 1000,
    senderEcu: 'ECM / TCM',
    receiverEcus: ['All'],
    description: 'Broadcast node alive heartbeat & network management frame',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Node Status & State of Health', type: 'uint8', scaling: '0x00=Operational, 0x01=Warning', units: 'State' },
    ],
  },
  0x101: {
    id: 0x101,
    hexId: '0x101',
    name: 'GMLAN_Node_Status_Chassis',
    bus: 'HS_CAN',
    dlc: 1,
    periodMs: 1000,
    senderEcu: 'EBCM (0x28)',
    receiverEcus: ['All'],
    description: 'Chassis node alive status broadcast',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Node Status', type: 'uint8', scaling: '0x00=Normal', units: 'State' },
    ],
  },
  0x102: {
    id: 0x102,
    hexId: '0x102',
    name: 'GMLAN_Node_Status_Body',
    bus: 'SW_CAN',
    dlc: 1,
    periodMs: 1000,
    senderEcu: 'BCM (0x40)',
    receiverEcus: ['All'],
    description: 'Body & interior bus node management broadcast',
    byteLayout: [
      { byteIndex: 0, bitRange: '7:0', field: 'Node Status', type: 'uint8', scaling: '0x00=Normal', units: 'State' },
    ],
  },
};

/**
 * Encode Engine RPM & Throttle to 0x0C9 frame
 */
export function encode0x0C9(
  rpm: number,
  brakePressed: boolean,
  brakePosPct: number,
  throttlePct: number,
  coolantTempC: number = 90
): CanFrame {
  const rpmCounts = Math.round(Math.min(8000, Math.max(0, rpm)) / 0.25);
  const rpmHigh = (rpmCounts >> 8) & 0xff;
  const rpmLow = rpmCounts & 0xff;
  const throttleByte = Math.round((Math.min(100, Math.max(0, throttlePct)) * 255) / 100);
  const brakeByte = Math.round((Math.min(100, Math.max(0, brakePosPct)) * 255) / 100);
  const coolantByte = Math.min(215, Math.max(0, Math.round(coolantTempC + 40)));

  const flagByte = (brakePressed ? 0x01 : 0x00) | 0x04; // bit0=Brake, bit2=Engine Running

  return {
    id: 0x0C9,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 8,
    timestamp: Date.now(),
    data: [flagByte, rpmHigh, rpmLow, throttleByte, coolantByte, 0x40, brakeByte, 0x05],
  };
}

/**
 * Decode 0x0C9 Engine_General_Status_1
 */
export function decode0x0C9(data: number[]) {
  if (data.length < 4) return null;
  const flagByte = data[0];
  const brakePressed = (flagByte & 0x01) !== 0;
  const engineRunning = (flagByte & 0x04) !== 0;
  const rawRpm = (data[1] << 8) | data[2];
  const rpm = rawRpm * 0.25;
  const throttlePct = (data[3] * 100) / 255;
  const coolantTempC = (data[4] ?? 130) - 40;
  const brakePosPct = data[6] !== undefined ? (data[6] * 100) / 255 : brakePressed ? 100 : 0;

  return {
    engineRpm: Math.round(rpm),
    brakePedalPressed: brakePressed,
    engineRunning,
    throttlePositionPct: Math.round(throttlePct),
    brakePositionPct: Math.round(brakePosPct),
    coolantTempC,
  };
}

/**
 * Encode 0x028 Vehicle Speed Information (VSS)
 */
export function encode0x028(speedMph: number, prndl: 'P' | 'R' | 'N' | 'D' = 'D'): CanFrame {
  const rawSpeed = Math.round(Math.min(160, Math.max(0, speedMph)) / 0.01);
  const speedHigh = (rawSpeed >> 8) & 0xff;
  const speedLow = rawSpeed & 0xff;
  const prndlMap: Record<string, number> = { P: 0x01, R: 0x02, N: 0x03, D: 0x04 };
  const prndlByte = prndlMap[prndl] ?? 0x04;

  return {
    id: 0x028,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 4,
    timestamp: Date.now(),
    data: [speedHigh, speedLow, 0x00, prndlByte],
  };
}

/**
 * Decode 0x028 Vehicle Speed
 */
export function decode0x028(data: number[]) {
  if (data.length < 2) return null;
  const rawSpeed = (data[0] << 8) | data[1];
  const speedMph = rawSpeed * 0.01;
  const speedKmh = speedMph * 1.60934;
  const prndlByte = data[3] ?? 0x04;
  const prndlLookup: Record<number, 'P' | 'R' | 'N' | 'D'> = {
    0x01: 'P',
    0x02: 'R',
    0x03: 'N',
    0x04: 'D',
  };
  const gear = prndlLookup[prndlByte] ?? 'D';

  return {
    vehicleSpeedMph: Math.round(speedMph * 10) / 10,
    vehicleSpeedKmh: Math.round(speedKmh * 10) / 10,
    gear,
  };
}

/**
 * Encode 0x018 12V Bus Voltage
 */
export function encode0x018(voltageV: number): CanFrame {
  const rawVal = Math.round(Math.max(0, Math.min(255, (voltageV - 5.0) / 0.0625)));
  return {
    id: 0x018,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 2,
    timestamp: Date.now(),
    data: [rawVal, 0x01],
  };
}

/**
 * Decode 0x018 12V Bus Voltage
 */
export function decode0x018(data: number[]) {
  if (data.length < 1) return null;
  const voltage = data[0] * 0.0625 + 5.0;
  return {
    busVoltage12V: Math.round(voltage * 100) / 100,
  };
}

/**
 * Encode 0x05B Steering Wheel Angle Sensor
 */
export function encode0x05B(angleDeg: number, rateDegSec: number = 0): CanFrame {
  const rawAngle = Math.round(angleDeg / 0.0625) + 0x8000;
  const clampedAngle = Math.max(0, Math.min(0xffff, rawAngle));
  const high = (clampedAngle >> 8) & 0xff;
  const low = clampedAngle & 0xff;
  const rateByte = Math.max(-128, Math.min(127, Math.round(rateDegSec / 4.0))) & 0xff;

  return {
    id: 0x05B,
    isExtended: false,
    bus: 'HS_CAN',
    direction: 'TX',
    dlc: 5,
    timestamp: Date.now(),
    data: [high, low, rateByte, 0x01, 0x0A],
  };
}

/**
 * Decode 0x05B Steering Wheel Angle
 */
export function decode0x05B(data: number[]) {
  if (data.length < 3) return null;
  const rawAngle = (data[0] << 8) | data[1];
  const angleDeg = (rawAngle - 0x8000) * 0.0625;
  const signedRate = (data[2] << 24) >> 24;
  const rateDegSec = signedRate * 4.0;

  return {
    steeringWheelAngleDeg: Math.round(angleDeg * 10) / 10,
    steeringRateDegSec: Math.round(rateDegSec * 10) / 10,
  };
}

/**
 * Encode 0x061 Outside Ambient Air Temperature
 */
export function encode0x061(tempC: number): CanFrame {
  const rawByte = Math.max(0, Math.min(255, Math.round((tempC + 40) / 0.5)));
  return {
    id: 0x061,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 2,
    timestamp: Date.now(),
    data: [rawByte, 0x80], // bit7=Valid
  };
}

/**
 * Decode 0x061 Outside Ambient Air Temperature
 */
export function decode0x061(data: number[]) {
  if (data.length < 1) return null;
  const tempC = data[0] * 0.5 - 40;
  const tempF = (tempC * 9) / 5 + 32;
  return {
    outsideAirTempC: Math.round(tempC * 10) / 10,
    outsideAirTempF: Math.round(tempF * 10) / 10,
  };
}

/**
 * Encode 0x005 TPMS Individual Pressures (PSI)
 */
export function encode0x005(fl: number, fr: number, rl: number, rr: number): CanFrame {
  const toRaw = (psi: number) => Math.max(0, Math.min(255, Math.round(psi / 0.25)));
  return {
    id: 0x005,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 6,
    timestamp: Date.now(),
    data: [toRaw(fl), toRaw(fr), toRaw(rl), toRaw(rr), 0x00, 0x00],
  };
}

/**
 * Decode 0x005 TPMS Wheel Pressures
 */
export function decode0x005(data: number[]): TpmsState | null {
  if (data.length < 4) return null;
  const parseWheel = (raw: number) => {
    const psi = Math.round(raw * 0.25 * 10) / 10;
    const kpa = Math.round(psi * 6.89476);
    let status: 'NORMAL' | 'LOW' | 'HIGH' | 'SENSOR_FAULT' = 'NORMAL';
    if (psi < 28) status = 'LOW';
    else if (psi > 44) status = 'HIGH';
    return {
      psi,
      kpa,
      status,
      sensorBatteryOk: true,
    };
  };

  return {
    frontLeft: parseWheel(data[0]),
    frontRight: parseWheel(data[1]),
    rearLeft: parseWheel(data[2]),
    rearRight: parseWheel(data[3]),
  };
}

/**
 * Encode 0x182 DIC Warning / Status Icons
 */
export function encode0x182(icons: DicIcons): CanFrame {
  let b0 = 0;
  if (icons.checkEngine) b0 |= 0x01;
  if (icons.abs) b0 |= 0x02;
  if (icons.tractionControl) b0 |= 0x04;
  if (icons.oilPressure) b0 |= 0x08;

  let b1 = 0;
  if (icons.batteryLow) b1 |= 0x01;
  if (icons.airbag) b1 |= 0x02;
  if (icons.highBeam) b1 |= 0x04;
  if (icons.doorAjar) b1 |= 0x08;

  let b2 = 0;
  if (icons.tpmsWarning) b2 |= 0x01;
  if (icons.seatbelt) b2 |= 0x02;
  if (icons.security) b2 |= 0x04;

  return {
    id: 0x182,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 4,
    timestamp: Date.now(),
    data: [b0, b1, b2, 0x00],
  };
}

/**
 * Decode 0x182 DIC Icons
 */
export function decode0x182(data: number[]): DicIcons | null {
  if (data.length < 3) return null;
  return {
    checkEngine: (data[0] & 0x01) !== 0,
    abs: (data[0] & 0x02) !== 0,
    tractionControl: (data[0] & 0x04) !== 0,
    oilPressure: (data[0] & 0x08) !== 0,
    batteryLow: (data[1] & 0x01) !== 0,
    airbag: (data[1] & 0x02) !== 0,
    highBeam: (data[1] & 0x04) !== 0,
    doorAjar: (data[1] & 0x08) !== 0,
    tpmsWarning: (data[2] & 0x01) !== 0,
    seatbelt: (data[2] & 0x02) !== 0,
    security: (data[2] & 0x04) !== 0,
  };
}

/**
 * Encode 0x185 ReqSetDispParms (DIC Layout & Mode Parameters)
 */
export function encode0x185(mode: 'NORMAL' | 'FLASH' | 'SCROLL' | 'PRIORITY_POPUP', speedMs: number = 300, timeoutSec: number = 5): CanFrame {
  const modeMap: Record<string, number> = {
    NORMAL: 0x00,
    FLASH: 0x01,
    SCROLL: 0x02,
    PRIORITY_POPUP: 0x03,
  };
  const modeByte = modeMap[mode] ?? 0x00;
  const speedByte = Math.max(1, Math.min(255, Math.round(speedMs / 10)));
  const timeoutByte = Math.max(1, Math.min(255, timeoutSec));

  return {
    id: 0x185,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 3,
    timestamp: Date.now(),
    data: [modeByte, speedByte, timeoutByte],
  };
}

/**
 * Encode 0x186 Text_Req_Set_Display (Multi-frame ASCII streaming to DIC lines)
 * Splits ASCII string up to 21 chars into 7-byte chunks
 */
export function encode0x186Frames(lineNumber: 1 | 2, text: string): CanFrame[] {
  const frames: CanFrame[] = [];
  const cleanText = text.padEnd(21, ' ').slice(0, 21);
  const chunks = [
    cleanText.slice(0, 7),
    cleanText.slice(7, 14),
    cleanText.slice(14, 21),
  ];

  chunks.forEach((chunk, seqIndex) => {
    const controlByte = ((lineNumber & 0x0f) << 4) | (seqIndex & 0x0f);
    const charBytes = Array.from(chunk).map((c) => c.charCodeAt(0) & 0x7f);

    frames.push({
      id: 0x186,
      isExtended: false,
      bus: 'SW_CAN',
      direction: 'TX',
      dlc: 8,
      timestamp: Date.now() + seqIndex * 25,
      data: [controlByte, ...charBytes],
    });
  });

  return frames;
}

/**
 * Decode 0x186 Text Frame
 */
export function decode0x186(data: number[]) {
  if (data.length < 2) return null;
  const control = data[0];
  const lineNumber = ((control >> 4) & 0x0f) as 1 | 2;
  const seqIndex = control & 0x0f;
  const textChars = data.slice(1, 8).map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ' ')).join('');

  return {
    lineNumber,
    seqIndex,
    textSegment: textChars,
  };
}

/**
 * Encode 0x00F Chime Command Trigger
 */
export function encode0x00F(tone: 'REMINDER' | 'WARNING' | 'CRITICAL' | 'KEY_IN_IGNITION' | 'SEATBELT', repeat: number = 3, cadenceMs: number = 250): CanFrame {
  const toneMap: Record<string, number> = {
    REMINDER: 0x01,
    WARNING: 0x02,
    CRITICAL: 0x03,
    KEY_IN_IGNITION: 0x04,
    SEATBELT: 0x05,
  };
  const toneByte = toneMap[tone] ?? 0x01;
  const cadenceByte = Math.max(1, Math.min(255, Math.round(cadenceMs / 10)));

  return {
    id: 0x00F,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 3,
    timestamp: Date.now(),
    data: [toneByte, Math.max(1, Math.min(10, repeat)), cadenceByte],
  };
}

/**
 * Encode 0x045 Chime Volume Level
 */
export function encode0x045(volumeLevel: number = 1): CanFrame {
  return {
    id: 0x045,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 1,
    timestamp: Date.now(),
    data: [Math.max(0, Math.min(2, volumeLevel))],
  };
}

/**
 * Encode 0x004 RFA Remote Keyless Entry Function
 */
export function encode0x004(func: RfaFunction, fobNumber: number = 1): CanFrame {
  const funcMap: Record<RfaFunction, number> = {
    LOCK: 0x01,
    UNLOCK: 0x02,
    TRUNK_RELEASE: 0x04,
    PANIC: 0x08,
    REMOTE_START: 0x10,
    IDLE: 0x00,
  };
  const funcByte = funcMap[func] ?? 0x00;

  return {
    id: 0x004,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 2,
    timestamp: Date.now(),
    data: [funcByte, Math.max(1, Math.min(4, fobNumber))],
  };
}

/**
 * Encode 0x064 Climate Control General Status 2
 */
export function encode0x064(hvac: HvacStatus): CanFrame {
  const fanByte = Math.max(0, Math.min(8, hvac.fanSpeed));
  let flagByte = 0;
  if (hvac.acClutchEngaged) flagByte |= 0x01;
  if (hvac.defrostActive) flagByte |= 0x02;
  if (hvac.recirculation) flagByte |= 0x04;
  if (hvac.rearDefrostActive) flagByte |= 0x08;

  const modeMap: Record<string, number> = {
    PANEL: 0x00,
    BI_LEVEL: 0x01,
    FLOOR: 0x02,
    DEFOG: 0x03,
    DEFROST: 0x04,
  };
  const modeByte = modeMap[hvac.airFlowMode] ?? 0x00;
  const driverTemp = Math.max(60, Math.min(90, hvac.driverTempSettingF));
  const passTemp = Math.max(60, Math.min(90, hvac.passTempSettingF));

  return {
    id: 0x064,
    isExtended: false,
    bus: 'SW_CAN',
    direction: 'TX',
    dlc: 5,
    timestamp: Date.now(),
    data: [fanByte, flagByte, modeByte, driverTemp, passTemp],
  };
}

/**
 * Decode 0x064 Climate Control Status
 */
export function decode0x064(data: number[]): HvacStatus | null {
  if (data.length < 5) return null;
  const fanSpeed = data[0];
  const flagByte = data[1];
  const modeLookup = ['PANEL', 'BI_LEVEL', 'FLOOR', 'DEFOG', 'DEFROST'] as const;
  const mode = modeLookup[data[2]] ?? 'PANEL';

  return {
    fanSpeed,
    acClutchEngaged: (flagByte & 0x01) !== 0,
    defrostActive: (flagByte & 0x02) !== 0,
    recirculation: (flagByte & 0x04) !== 0,
    rearDefrostActive: (flagByte & 0x08) !== 0,
    airFlowMode: mode,
    driverTempSettingF: data[3] || 72,
    passTempSettingF: data[4] || 72,
  };
}
