import { describe, expect, it } from 'vitest'
import Packer from '../src/index'

describe('packer', () => {
  it('should exist', () => {
    expect(Packer).toBeDefined()
  })

  it('should be creatable', () => {
    expect(() => new Packer('>HH')).not.toThrow()
  })

  it('should correctly calculate the size', () => {
    const packer = new Packer('>bBhHiIlLfd10s100p')
    expect(packer.size).toEqual(144)
  })

  describe('.unpack', () => {
    it('should work', () => {
      const packer = new Packer('>b')
      const buffer = new Uint8Array([0x01]).buffer
      const [one] = packer.unpack(buffer)
      expect(one).toEqual(1)
    })

    it('should not accept a buffer with a length not equal to Packer.size', () => {
      const packer = new Packer('>b')
      const buffer = new Uint8Array([0x10, 0xFF, 0xAB, 0x12]).buffer
      expect(() => packer.unpack(buffer)).toThrow(Error)
    })
  })

  describe('.unpack_from', () => {
    it('should accept a buffer', () => {
      const buffer = new Uint8Array([0x00, 0x01]).buffer
      expect(() => new Packer('>BB').unpack_from(buffer)).not.toThrow()
    })

    it('should handle endianness correctly', () => {
      const buffer = new Uint8Array([0x00, 0x01]).buffer
      const [first] = new Packer('<H').unpack_from(buffer)
      expect(first).toEqual(256)
    })

    it('should handle pad bytes correctly', () => {
      const buffer = new Uint8Array([0x00, 0x01, 0x00]).buffer
      const [first] = new Packer('xH').unpack_from(buffer)
      expect(first).toEqual(256)
    })

    it('should handle bytes correctly', () => {
      const buffer = new Uint8Array([0xFF]).buffer
      const [byte] = new Packer('b').unpack_from(buffer)
      expect(byte).toEqual(-1)
    })

    it('should handle unsigned bytes correctly', () => {
      const buffer = new Uint8Array([0xFF]).buffer
      const [byte] = new Packer('B').unpack_from(buffer)
      expect(byte).toEqual(255)
    })

    it('should handle short ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01]).buffer
      const [number] = new Packer('h').unpack_from(buffer)
      expect(number).toEqual(-20735)
    })

    it('should handle unsigned short ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01]).buffer
      const [number] = new Packer('H').unpack_from(buffer)
      expect(number).toEqual(44801)
    })

    it('should handle ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01, 0x01, 0x01]).buffer
      const [number] = new Packer('i').unpack_from(buffer)
      expect(number).toEqual(-1358888703)
    })

    it('should handle unsigned ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01, 0x01, 0x01]).buffer
      const [number] = new Packer('I').unpack_from(buffer)
      expect(number).toEqual(2936078593)
    })

    it('should handle long ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01, 0x01, 0x01]).buffer
      const [number] = new Packer('l').unpack_from(buffer)
      expect(number).toEqual(-1358888703)
    })

    it('should handle unsigned long ints correctly', () => {
      const buffer = new Uint8Array([0xAF, 0x01, 0x01, 0x01]).buffer
      const [number] = new Packer('L').unpack_from(buffer)
      expect(number).toEqual(2936078593)
    })

    it('should handle floats correctly', () => {
      const buffer = new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]).buffer
      const [number] = new Packer('f').unpack_from(buffer)
      expect(number).toBeCloseTo(-8346975, 0)
    })

    it('should handle doubles correctly', () => {
      const buffer = new Uint8Array([0x3F, 0xF1, 0xC2, 0x8F, 0x5C, 0x28, 0xF5, 0xC3]).buffer
      const [number] = new Packer('d').unpack_from(buffer)
      expect(number).toBeCloseTo(1.11, 2)
    })

    it('should handle strings correctly', () => {
      const buffer = new Uint8Array([0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68]).buffer
      const [string] = new Packer('>8s').unpack_from(buffer)
      expect(string).toEqual('abcdefgh')
    })

    it('should handle combos correctly', () => {
      const buffer = new Uint8Array([0x01, 0xFF]).buffer
      const [first, second] = new Packer('2B').unpack_from(buffer)
      expect(first).toEqual(1)
      expect(second).toEqual(255)
    })
  })

  describe('.pack', () => {
    it('should pack a string correctly', () => {
      const string = 'abcdef'
      const buffer = new Packer('6s').pack(string)
      const [cmpString] = new Packer('6s').unpack_from(buffer)
      expect(cmpString).toEqual(string)
    })

    it('should pack numbers correctly', () => {
      const num = 100
      const buffer = new Packer('bBhHiIlL').pack(num, num, num, num, num, num, num, num)
      const nums = new Packer('bBhHiIlL').unpack_from(buffer)
      nums.forEach(x => expect(x).toEqual(num))
    })

    it('should throw an error when there aren\'t enough values', () => {
      const string = 'abcde'
      const packer = new Packer('6sH')
      expect(() => packer.pack(string)).toThrow(Error)
    })
  })
})
