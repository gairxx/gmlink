import React from 'react';
import { VehicleTelemetry } from '../lib/gmlan/types';
import {
  AlertTriangle,
  Battery,
  Disc,
  Droplet,
  Flame,
  Gauge,
  Lightbulb,
  Radio,
  ShieldAlert,
  Thermometer,
  Zap,
} from 'lucide-react';

interface GaugeClusterProps {
  telemetry: VehicleTelemetry;
}

export const GaugeCluster: React.FC<GaugeClusterProps> = ({ telemetry }) => {
  // Gauge math: -135 deg to +135 deg (270 deg total arc)
  const rpmRatio = Math.min(1, Math.max(0, telemetry.engineRpm / 8000));
  const rpmAngle = -135 + rpmRatio * 270;

  const speedRatio = Math.min(1, Math.max(0, telemetry.vehicleSpeedMph / 160));
  const speedAngle = -135 + speedRatio * 270;

  // Steering angle clamped -180 to 180 for visual dial
  const steeringDeg = Math.max(-180, Math.min(180, telemetry.steeringWheelAngleDeg));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Top Warning & Status Lamp Ribbon (0x182) */}
      <div className="flex items-center justify-center gap-6 py-2.5 px-4 bg-slate-950/80 border border-slate-800/80 rounded-xl mb-6 flex-wrap">
        {/* Check Engine */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.checkEngine ? 'text-amber-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Check Engine MIL"
        >
          <Flame className="w-4 h-4" />
          <span>CHECK ENGINE</span>
        </div>

        {/* ABS */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.abs ? 'text-amber-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Anti-Lock Brakes (ABS)"
        >
          <Disc className="w-4 h-4" />
          <span>ABS</span>
        </div>

        {/* Traction Control / StabiliTrak */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.tractionControl ? 'text-amber-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: StabiliTrak / ESC"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>STABILITRAK</span>
        </div>

        {/* Oil Pressure */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.oilPressure ? 'text-rose-500 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Engine Oil Pressure Low"
        >
          <Droplet className="w-4 h-4" />
          <span>OIL</span>
        </div>

        {/* Battery */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.batteryLow ? 'text-rose-500 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Charging System Failure"
        >
          <Battery className="w-4 h-4" />
          <span>BATTERY</span>
        </div>

        {/* TPMS */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.tpmsWarning ? 'text-amber-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Tire Pressure Warning"
        >
          <Gauge className="w-4 h-4" />
          <span>TPMS</span>
        </div>

        {/* High Beam */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.highBeam ? 'text-cyan-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: High Beam"
        >
          <Lightbulb className="w-4 h-4" />
          <span>HIGH BEAM</span>
        </div>

        {/* Security / Immobilizer */}
        <div
          className={`flex items-center gap-1.5 text-xs font-mono transition-opacity ${
            telemetry.dic.icons.security ? 'text-amber-400 opacity-100 font-bold' : 'text-slate-700 opacity-40'
          }`}
          title="0x182: Security System Passlock"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>SECURITY</span>
        </div>
      </div>

      {/* Main Gauge Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Dial: Tachometer (0 - 8000 RPM) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* SVG Dial Background */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              {/* Outer dial track */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="377"
                strokeDashoffset="94"
                strokeLinecap="round"
              />
              {/* Redline zone (6500 to 8000 RPM) */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeDasharray="70 400"
                strokeDashoffset="-210"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* Active RPM Arc */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="12"
                strokeDasharray="377"
                strokeDashoffset={377 - rpmRatio * 283}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>

            {/* Needle Pivot */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{ transform: `rotate(${rpmAngle}deg)` }}
            >
              <div className="w-1 h-24 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] -translate-y-12" />
            </div>

            {/* Center Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                {telemetry.engineRpm}
              </span>
              <span className="text-[11px] font-mono text-cyan-400 tracking-wider">
                RPM × 1000
              </span>
              <span className="text-[10px] font-mono text-slate-500 mt-1">
                CAN ID 0x0C9
              </span>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            TACHOMETER (0.25 SCALE)
          </div>
        </div>

        {/* Center Console: Driver Information Center & Transmission PRNDL */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center px-4">
          {/* PRNDL Indicator */}
          <div className="flex items-center gap-3 bg-slate-950 px-5 py-2 rounded-xl border border-slate-800 mb-4 font-mono text-sm">
            {(['P', 'R', 'N', 'D'] as const).map((gear) => (
              <span
                key={gear}
                className={`px-2 py-0.5 rounded transition-colors ${
                  telemetry.gear === gear
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-slate-600'
                }`}
              >
                {gear}
              </span>
            ))}
          </div>

          {/* Virtual DIC Dot-Matrix OLED Screen */}
          <div className="w-full max-w-sm bg-black border-2 border-emerald-950/80 rounded-lg p-4 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] relative">
            <div className="absolute top-1.5 left-2.5 text-[9px] font-mono text-emerald-600/80">
              DIC · GM VSS 0x028 / 0x186
            </div>
            <div className="text-right text-[9px] font-mono text-emerald-600/80 mb-2">
              LINE 1-2 STREAM
            </div>

            <div className="font-dic text-emerald-400 text-lg tracking-wider min-h-[1.75rem] uppercase font-bold drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
              {telemetry.dic.line1 || 'SYSTEM OK'}
            </div>
            <div className="font-dic text-emerald-500 text-sm tracking-wide min-h-[1.25rem] uppercase mt-1">
              {telemetry.dic.line2 || 'GMLAN BUS ACTIVE'}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 gap-3 w-full mt-4 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                12V BUS
              </span>
              <span className="text-slate-100 font-bold tabular-nums">
                {telemetry.busVoltage12V.toFixed(2)} V
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                AMBIENT
              </span>
              <span className="text-slate-100 font-bold tabular-nums">
                {telemetry.outsideAirTempF.toFixed(0)} °F ({telemetry.outsideAirTempC.toFixed(0)}°C)
              </span>
            </div>
          </div>
        </div>

        {/* Right Dial: Speedometer (0 - 160 MPH) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* SVG Dial Background */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              {/* Outer dial track */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeDasharray="377"
                strokeDashoffset="94"
                strokeLinecap="round"
              />
              {/* Active Speed Arc */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="12"
                strokeDasharray="377"
                strokeDashoffset={377 - speedRatio * 283}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>

            {/* Needle Pivot */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{ transform: `rotate(${speedAngle}deg)` }}
            >
              <div className="w-1 h-24 bg-sky-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)] -translate-y-12" />
            </div>

            {/* Center Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-mono font-bold tracking-tight text-white tabular-nums">
                {Math.round(telemetry.vehicleSpeedMph)}
              </span>
              <span className="text-xs font-mono text-sky-400 tracking-wider">
                MPH
              </span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {Math.round(telemetry.vehicleSpeedKmh)} km/h
              </span>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2">
            SPEEDOMETER (VSS 0x028)
          </div>
        </div>
      </div>

      {/* Bottom Sensor Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
        {/* Throttle & Brake Pedals (0x0C9) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between">
            <span>PEDAL POSITION (0x0C9)</span>
            <span className="text-cyan-400">HS-CAN 20ms</span>
          </div>

          {/* Throttle Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Throttle Position</span>
              <span className="tabular-nums font-bold">{telemetry.throttlePositionPct}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-75"
                style={{ width: `${telemetry.throttlePositionPct}%` }}
              />
            </div>
          </div>

          {/* Brake Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Brake Pedal</span>
              <span className="tabular-nums font-bold">
                {telemetry.brakePedalPressed ? `${telemetry.brakePositionPct}% (APPLIED)` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  telemetry.brakePedalPressed ? 'bg-rose-500' : 'bg-slate-700'
                }`}
                style={{ width: `${telemetry.brakePositionPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steering Wheel Angle (0x05B) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>STEERING SENSOR (0x05B)</span>
            <span className="text-cyan-400">HS-CAN 10ms</span>
          </div>

          <div className="flex items-center justify-center py-2 gap-4">
            {/* Steering Wheel Rotator */}
            <div
              className="w-16 h-16 rounded-full border-2 border-slate-600 flex items-center justify-center transition-transform duration-75 relative shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ transform: `rotate(${steeringDeg}deg)` }}
            >
              <div className="w-full h-1 bg-cyan-400 absolute" />
              <div className="h-full w-1 bg-slate-500 absolute" />
              <div className="w-4 h-4 rounded-full bg-slate-950 border border-cyan-400 z-10" />
            </div>

            <div className="flex flex-col font-mono">
              <span className="text-2xl font-bold text-white tabular-nums">
                {telemetry.steeringWheelAngleDeg > 0 ? `+${telemetry.steeringWheelAngleDeg}°` : `${telemetry.steeringWheelAngleDeg}°`}
              </span>
              <span className="text-[11px] text-slate-400">
                Rate: {telemetry.steeringRateDegSec.toFixed(1)} °/s
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 text-center">
            StabiliTrak ESC Calibration: Active
          </div>
        </div>

        {/* TPMS 4-Wheel Pressures (0x005) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>TPMS PRESSURES (0x005)</span>
            <span className="text-cyan-400">SW-CAN 2000ms</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">FRONT LEFT</div>
              <div className="text-white font-bold tabular-nums text-sm">
                {telemetry.tpms.frontLeft.psi.toFixed(1)} PSI
              </div>
              <div className="text-[10px] text-emerald-400">
                {telemetry.tpms.frontLeft.kpa} kPa · OK
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">FRONT RIGHT</div>
              <div className="text-white font-bold tabular-nums text-sm">
                {telemetry.tpms.frontRight.psi.toFixed(1)} PSI
              </div>
              <div className="text-[10px] text-emerald-400">
                {telemetry.tpms.frontRight.kpa} kPa · OK
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">REAR LEFT</div>
              <div className="text-white font-bold tabular-nums text-sm">
                {telemetry.tpms.rearLeft.psi.toFixed(1)} PSI
              </div>
              <div className="text-[10px] text-emerald-400">
                {telemetry.tpms.rearLeft.kpa} kPa · OK
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">REAR RIGHT</div>
              <div className="text-white font-bold tabular-nums text-sm">
                {telemetry.tpms.rearRight.psi.toFixed(1)} PSI
              </div>
              <div className="text-[10px] text-emerald-400">
                {telemetry.tpms.rearRight.kpa} kPa · OK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
