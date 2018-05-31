const Promise = require("bluebird").Promise;
const fs = Promise.promisifyAll(require("fs"));
const iconv = require("iconv-lite");

const INT_SIZE = 4;
const SHORT_SIZE = 2;
const BYTE_SIZE = 1;

/**
 * Returns parsed JSON of Gravity Defield levels
 * @see {@link http://gdtr.net/handbook/mrg/} to see .mrg composition
 * @param {String} path Path to .mrg file
 * @returns {Object} Object contains title and pointers of map
 */
module.exports = async path => {
  const file = await fs.readFileAsync(path);

  const levels = [];
  const levelsDescription = [];

  let offset = 0;
  // Parse levels description
  for (let i = 0; i < 3; i++) {
    // Level tracks count
    const count = readInt(file, offset);

    const level = [];
    for (let i = 0; i < count; i++) {
      const trackOffset = readInt(file);
      let nameBytes = [];

      // Read title bytes
      while (nameBytes.length < 40) {
        const byte = readByte(file, offset);
        if (byte == 0x00) {
          break;
        }
        nameBytes.push(byte);
      }

      // Parse title bytes into UTF-8 string
      const titleBuf = new Buffer(nameBytes);
      const title = iconv
        .encode(iconv.decode(titleBuf, "cp1251"), "utf8")
        .toString();

      level.push({
        offset: trackOffset,
        title
      });
    }

    levelsDescription.push(level);
  }

  // Parse tracks
  for (let i = 0; i < 3; i++) {
    const level = [];

    for (let j = 0; j < levelsDescription[i].length; j++) {
      offset = levelsDescription[i][j].offset;

      const mark = readByte(file, offset); // First byte of track, unused
      const start = readIntCoordinates();
      const finish = readIntCoordinates();
      const pointsCount = readShort(file);

      const first = readIntCoordinates(false);

      const points = [first];
      for (let k = 1; k < pointsCount - 1; k++) {
        let point = readByteCoordinates(false);

        if (point.x === -1) {
          offset -= BYTE_SIZE;
          points.push(readIntCoordinates(false));
          continue;
        }

        const { x: lastX, y: lastY } = points[points.length - 1];

        points.push({
          x: (point.x += lastX),
          y: (point.y += lastY)
        });
      }

      const track = {
        title: levelsDescription[i][j].title,
        start,
        finish,
        pointsCount,
        points
      };

      level.push(track);
    }

    levels.push(level);
  }

  return levels;

  // HELPERS

  function readInt(buf) {
    const int = buf.readIntBE(offset, INT_SIZE);
    offset += INT_SIZE;

    return int;
  }

  function readByte(buf) {
    const byte = buf.readIntBE(offset, BYTE_SIZE);
    offset += BYTE_SIZE;

    return byte;
  }

  function readShort(buf) {
    const short = buf.readIntBE(offset, SHORT_SIZE);
    offset += SHORT_SIZE;

    return short;
  }

  function readIntCoordinates(decompress = true) {
    if (decompress) {
      return {
        x: parseCoordinate(readInt(file)),
        y: parseCoordinate(readInt(file))
      };
    } else {
      return {
        x: readInt(file),
        y: readInt(file)
      };
    }
  }

  function readByteCoordinates(decompress = true) {
    if (decompress) {
      return {
        x: parseCoordinate(readByte(file)),
        y: parseCoordinate(readByte(file))
      };
    } else {
      return {
        x: readByte(file),
        y: readByte(file)
      };
    }
  }

  function parseCoordinate(number) {
    return (number << 3) >> 16;
  }
};
