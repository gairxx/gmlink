/**
 * ISO 15765-2 / CAN-TP Transport Protocol Implementation
 * Handles multi-frame packet segmentation and reassembly for UDS / ISO 14229 diagnostics.
 */

import { BusType, CanFrame } from './types';

export enum CanTpFrameType {
  SINGLE_FRAME = 0x00,
  FIRST_FRAME = 0x10,
  CONSECUTIVE_FRAME = 0x20,
  FLOW_CONTROL = 0x30,
}

export enum FlowStatus {
  CLEAR_TO_SEND = 0,
  WAIT = 1,
  OVERFLOW = 2,
}

export interface ReassembledPayload {
  sourceId: number;
  targetId: number;
  payload: number[];
  timestamp: number;
}

export class CanTpHandler {
  private rxBuffers: Map<
    number,
    {
      totalLength: number;
      receivedData: number[];
      nextSeqIndex: number;
      targetId: number;
      sourceId: number;
      timestamp: number;
      bus: BusType;
    }
  > = new Map();

  /**
   * Packetize an arbitrary diagnostic payload into ISO 15765-2 CAN frames
   */
  public segmentPayload(
    targetArbId: number,
    payload: number[],
    bus: BusType = 'HS_CAN',
    paddingByte: number = 0xaa
  ): CanFrame[] {
    const frames: CanFrame[] = [];
    const len = payload.length;

    if (len <= 7) {
      // Single Frame (SF)
      // Byte 0: 0x0 | (len & 0x0F)
      const data: number[] = [0x00 | (len & 0x0f), ...payload];
      while (data.length < 8) data.push(paddingByte);

      frames.push({
        id: targetArbId,
        isExtended: false,
        bus,
        direction: 'TX',
        dlc: 8,
        timestamp: Date.now(),
        data,
      });
      return frames;
    }

    // First Frame (FF)
    // Byte 0: 0x10 | ((len >> 8) & 0x0F)
    // Byte 1: (len & 0xFF)
    // Byte 2..7: First 6 data bytes
    const ffByte0 = 0x10 | ((len >> 8) & 0x0f);
    const ffByte1 = len & 0xff;
    const firstChunk = payload.slice(0, 6);
    frames.push({
      id: targetArbId,
      isExtended: false,
      bus,
      direction: 'TX',
      dlc: 8,
      timestamp: Date.now(),
      data: [ffByte0, ffByte1, ...firstChunk],
    });

    // Consecutive Frames (CF)
    // Byte 0: 0x20 | (seqIndex & 0x0F)
    // Byte 1..7: Next 7 data bytes
    let offset = 6;
    let seq = 1;

    while (offset < len) {
      const chunk = payload.slice(offset, offset + 7);
      const cfByte0 = 0x20 | (seq & 0x0f);
      const cfData = [cfByte0, ...chunk];
      while (cfData.length < 8) cfData.push(paddingByte);

      frames.push({
        id: targetArbId,
        isExtended: false,
        bus,
        direction: 'TX',
        dlc: 8,
        timestamp: Date.now() + seq * 10,
        data: cfData,
      });

      offset += 7;
      seq = (seq + 1) % 16;
    }

    return frames;
  }

  /**
   * Process an incoming CAN frame; returns reassembled payload when complete, or null
   */
  public processIncomingFrame(frame: CanFrame): {
    reassembled: ReassembledPayload | null;
    flowControlRequired: CanFrame | null;
  } {
    const data = frame.data;
    if (data.length === 0) return { reassembled: null, flowControlRequired: null };

    const pciType = data[0] & 0xf0;

    // Single Frame (SF)
    if (pciType === CanTpFrameType.SINGLE_FRAME) {
      const sfLen = data[0] & 0x0f;
      if (sfLen > 0 && sfLen <= 7) {
        const payload = data.slice(1, 1 + sfLen);
        return {
          reassembled: {
            sourceId: frame.id,
            targetId: frame.id === 0x7e8 ? 0x7e0 : frame.id - 8,
            payload,
            timestamp: frame.timestamp,
          },
          flowControlRequired: null,
        };
      }
    }

    // First Frame (FF)
    if (pciType === CanTpFrameType.FIRST_FRAME) {
      const totalLen = ((data[0] & 0x0f) << 8) | data[1];
      const initialData = data.slice(2, 8);

      this.rxBuffers.set(frame.id, {
        totalLength: totalLen,
        receivedData: [...initialData],
        nextSeqIndex: 1,
        targetId: frame.id,
        sourceId: frame.id,
        timestamp: frame.timestamp,
        bus: frame.bus,
      });

      // Generate Flow Control Frame (FC)
      // 0x30 = CTS (Clear To Send), BlockSize = 0 (infinite), STmin = 10ms (0x0A)
      const fcFrame: CanFrame = {
        id: frame.id === 0x7e8 ? 0x7e0 : 0x7e0,
        isExtended: false,
        bus: frame.bus,
        direction: 'TX',
        dlc: 8,
        timestamp: Date.now(),
        data: [0x30, 0x00, 0x0a, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
      };

      return { reassembled: null, flowControlRequired: fcFrame };
    }

    // Consecutive Frame (CF)
    if (pciType === CanTpFrameType.CONSECUTIVE_FRAME) {
      const session = this.rxBuffers.get(frame.id);
      if (!session) return { reassembled: null, flowControlRequired: null };

      const seq = data[0] & 0x0f;
      if (seq !== session.nextSeqIndex) {
        // Sequence mismatch
        this.rxBuffers.delete(frame.id);
        return { reassembled: null, flowControlRequired: null };
      }

      const remaining = session.totalLength - session.receivedData.length;
      const bytesToTake = Math.min(remaining, 7);
      session.receivedData.push(...data.slice(1, 1 + bytesToTake));
      session.nextSeqIndex = (session.nextSeqIndex + 1) % 16;

      if (session.receivedData.length >= session.totalLength) {
        const completed = {
          sourceId: session.sourceId,
          targetId: session.targetId,
          payload: [...session.receivedData],
          timestamp: Date.now(),
        };
        this.rxBuffers.delete(frame.id);
        return { reassembled: completed, flowControlRequired: null };
      }
    }

    return { reassembled: null, flowControlRequired: null };
  }

  /**
   * Reset any pending sessions
   */
  public reset() {
    this.rxBuffers.clear();
  }
}
