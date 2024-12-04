const ops: Record<string, [GetProcesses, SetProcesses, Size]> = {
  b: ['getInt8', 'setInt8', 1], // Char (1)
  B: ['getUint8', 'setUint8', 1], // Unsigned char (1)
  h: ['getInt16', 'setInt16', 2], // Short (2)
  H: ['getUint16', 'setUint16', 2], // Unsigned short (2)
  i: ['getInt32', 'setInt32', 4], // Int (4)
  I: ['getUint32', 'setUint32', 4], // Unsigned int (4)
  l: ['getInt32', 'setInt32', 4], // Long (4)
  L: ['getUint32', 'setUint32', 4], // Unsigned long (4)
  // q: null, // Long long (8) - not supported natively
  // Q: null, // Unsigned long long (8) - not supported natively
  f: ['getFloat32', 'setFloat32', 4], // Float (4)
  d: ['getFloat64', 'setFloat64', 8], // Double (8)
  s: ['toString', 'toString', 1], // String
  p: ['toString', 'toString', 1], // String
  x: ['Pad', 'Pad', 1], // Pad byte
};
type GetProcesses =
  'getInt8' |
  'getUint8' |
  'getInt16' |
  'getUint16' |
  'getInt32' |
  'getUint32' |
  'getFloat32' |
  'getFloat64' |
  'toString' |
  'Pad';
type SetProcesses =
  'setInt8' |
  'setUint8' |
  'setInt16' |
  'setUint16' |
  'setInt32' |
  'setUint32' |
  'setFloat32' |
  'setFloat64' |
  'toString' |
  'Pad';

type Size = 1 | 2 | 4 | 8;
type Times = number;
type PackerProcess = [SetProcesses, Size, Times]
type UnpackProcess = [GetProcesses, Size, Times]

export default class Packer {
  private size: number;
  private endian: string;
  private packProcess: PackerProcess[] = [];
  private unpackProcess: UnpackProcess[] = [];

  constructor(format: string) {
    format = format.trim()
    this.size = 0;
    // endian
    this.endian = 'BE';
    const endianMatch = /^(<|>|!)/.exec(format);
    if (endianMatch) {
      if (endianMatch[0] === '<') {
        this.endian = 'LE';
      }
      format = format.substring(1);
    }

    while (format.length > 0) {
      let numLength = 1;
      const match = /^[0-9]+/.exec(format);
      if (match) {
        numLength = parseInt(match[0], 10);
        format = format.substring(match[0].length);
      }

      const char = format[0];
      this.packProcess.push([ops[char][1], ops[char][2], numLength]);
      this.unpackProcess.push([ops[char][0], ops[char][2], numLength]);

      if (char === 's' || char === 'p' || char === 'x') {
        this.size += numLength;
      } else {
        this.size += ops[char][2] * numLength;
      }
      format = format.substring(1);
    }
  }

  calcSize() {
    return this.size;
  }

  pack(...vals: any[]): ArrayBuffer {
    const buffer = new ArrayBuffer(this.size);
    const view = new DataView(buffer);
    let offset = 0;
    let index = 0;
    const textEncoder = new TextEncoder();

    for (const [set, size, times] of this.packProcess) {
      if (index >= vals.length) {
        throw new Error('Need more values.');
      }
      // s, p
      if (set === 'toString') {
        const encodedString = textEncoder.encode(vals[index]);
        new Uint8Array(buffer, offset, times).set(encodedString.slice(0, times));
        offset += times;
      }
      // x
      else if (set === 'Pad') {
        offset += times;
      }
      else {
        for (let i = 0; i < times; i++) {
          view[set](offset, vals[index], this.endian === 'LE');
          offset += size;
        }
      }
      index++;
    }

    return buffer;
  }

  unpack(buffer: ArrayBuffer): any[] {
    if (buffer.byteLength !== this.size) {
      throw new Error('Buffer length must be the same as the formatting string length.');
    }
    const vals: any[] = [];
    const view = new DataView(buffer);
    const textDecoder = new TextDecoder();
    let offset = 0

    for (const [get, size, times] of this.unpackProcess) {
      // s, p
      if (get === 'toString') {
        const stringBytes = new Uint8Array(buffer, offset, times);
        vals.push(textDecoder.decode(stringBytes));
        offset += times;
      }
      // x
      else if (get === 'Pad') {
        offset += times;
      }
      else {
        for (let i = 0; i < times; i++) {
          const value = view[get](offset, this.endian === 'LE');
          vals.push(value);
          offset += size;
        }
      }
    }

    return vals;
  }
}