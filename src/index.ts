export default class Packer {
  private format: string;
  private size: number;
  private endian: string;
  private ops: Record<string, any>;

  constructor(format: string) {
    this.format = format;

    this.size = 0;
    // >: Big End
    this.endian = "BE";

    const endianMatch = /^(<|>|!)/.exec(format);
    if (endianMatch) {
      if (endianMatch[0] === "<") {
        this.endian = "LE";
      }
      format = this.format = format.substring(1);
    }

    // Set the operations
    this.ops = {
      x: null, // Pad byte
      b: ["getInt8", "setInt8", 1], // Char (1)
      B: ["getUint8", "setUint8", 1], // Unsigned char (1)
      h: [`getInt16`, `setInt16`, 2], // Short (2)
      H: [`getUint16`, `setUint16`, 2], // Unsigned short (2)
      i: [`getInt32`, `setInt32`, 4], // Int (4)
      I: [`getUint32`, `setUint32`, 4], // Unsigned int (4)
      l: [`getInt32`, `setInt32`, 4], // Long (4)
      L: [`getUint32`, `setUint32`, 4], // Unsigned long (4)
      q: null, // Long long (8) - not supported natively
      Q: null, // Unsigned long long (8) - not supported natively
      f: [`getFloat32`, `setFloat32`, 4], // Float (4)
      d: [`getFloat64`, `setFloat64`, 8], // Double (8)
      s: "toString", // String
      p: "toString", // String
    };

    while (format.length > 0) {
      let numLength = 1;
      const match = /^[0-9]+/.exec(format);
      if (match) {
        numLength = parseInt(match[0], 10);
        format = format.substring(match[0].length);
      }

      const char = format[0];

      if (char === 's' || char === 'p' || char === 'x') {
        this.size += numLength;
      } else {
        this.size += this.ops[char][2] * numLength;
      }
      format = format.substring(1);
    }
  }

  calcsize() {
    return this.size;
  }

  unpack(buffer: ArrayBuffer): any[] {
    if (buffer.byteLength !== this.size) {
      throw new Error("Buffer length must be the same as the formatting string length.");
    }

    return this.unpack_from(buffer);
  }

  unpack_from(buffer: ArrayBuffer, position: number = 0): any[] {
    const vals: any[] = [];
    const view = new DataView(buffer);
    let format = this.format;

    while (format.length > 0) {
      let times = 1;
      const numMatch = /^[0-9]+/.exec(format);
      if (numMatch) {
        times = parseInt(numMatch[0], 10);
        format = format.substring(numMatch[0].length);
      }

      const char = format[0];
      format = format.substring(1);

      if (char === "s" || char === "p") {
        const stringBytes = new Uint8Array(buffer, position, times);
        vals.push(new TextDecoder().decode(stringBytes));
        position += times;
      } else if (char === "x") {
        position += times;
      } else {
        const op = this.ops[char];
        for (let i = 0; i < times; i++) {
          const method = op[0];
          const value = (view as any)[method](position, this.endian === "LE");
          vals.push(value);
          position += op[2];
        }
      }
    }

    return vals;
  }

  pack(...vals: any[]): ArrayBuffer {
    const buffer = new ArrayBuffer(this.size);
    this.pack_into(buffer, 0, ...vals);
    return buffer;
  }

  pack_into(buffer: ArrayBuffer, offset: number, ...vals: any[]): void {
    const view = new DataView(buffer);
    let index = 0;
    let format = this.format;

    while (format.length > 0) {
      if (index >= vals.length) {
        throw new Error("Need more values.");
      }

      let times = 1;
      const match = /^[0-9]+/.exec(format);
      if (match) {
        times = parseInt(match[0], 10);
        format = format.substring(match[0].length);
      }

      const char = format[0];
      format = format.substring(1);

      if (char === "s" || char === "p") {
        const encoder = new TextEncoder();
        const encodedString = encoder.encode(vals[index]);
        new Uint8Array(buffer, offset, times).set(encodedString.slice(0, times));
        offset += times;
      } else if (char === "x") {
        offset += times;
      } else {
        const op = this.ops[char];
        for (let i = 0; i < times; i++) {
          const method = op[1];
          (view as any)[method](offset, vals[index], this.endian === "LE");
          offset += op[2];
        }
      }

      index++;
    }
  }
}


