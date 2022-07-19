const fs = require('fs');
const polycrc = require('polycrc');
const clc = require('cli-color');
const argv = require('minimist')(process.argv.slice(2));

if (!argv._.length) {
	console.log(clc.red('No file name provided'));
	return;
}

const {
	_: [filename, newFilename = filename.replace('.odx', '.MODIFIED.odx')],
	format = 'bin',
	debug = false,
} = argv;

const byteSwap = (str) => str.slice(2, 4) + str.slice(0, 2);
const prettify = (value, length = 4) => value.toString(16).toUpperCase().padStart(length, '0');
const DATA02length = 0xe000;
const DATA02length25 = 0x18000;
const crc32Calculator = polycrc.crc(32, 0x04c11db7, 0, 0, true); //   size, poly, init, xorout, refin/refout
const crc16Calculator = polycrc.crc(16, 0x1021, 0xffff, 0, false); // size, poly, init, xorout, refin/refout

fs.readFile(filename, 'utf8', (err, data) => {
	if (err) return console.log(err);

	const names = [...data.matchAll(/<FLASHDATA.*?ID=".*?\.(\S+)"/gim)].map((val) => val[1]),
		hexData = [...data.matchAll(/<DATA>(\S+)<\/DATA>/gims)].map((val) => val[1]),
		crc32Data = {};

	[
		...data.matchAll(
			/<FW-CHECKSUM.*?>(\S+?)<\/FW-CHECKSUM>.*?<VALIDITY-FOR.*?>(\S+?)<\/VALIDITY-FOR>/gims,
		),
	].map((val) => (crc32Data[val[2]] = { value: val[1], match: val[0] }));

	let writeFlag = false;
	names
		.filter((val) => val.indexOf('ERASE') === -1)
		.map((val) => {
			try {
				const originalData = hexData[names.indexOf(val)];
				let rawData = fs.readFileSync(`${filename}.${val}.${format}`);
				if (format !== 'bin') {
					rawData = Uint8Array.from(
						String(rawData)
							.match(/(..)/g)
							.map((val) => parseInt(val, 16)),
					);
				}
				let newData = [...rawData].map((char) => prettify(char, 2)).join('');

				if (originalData === newData) {
					console.log(clc.green((val + '.' + format).padEnd(14)) + ` didn't change`);
				} else {
					writeFlag = true;
					console.log(clc.yellow((val + '.' + format).padEnd(14)) + ` has been modified`);

					if (rawData.length === DATA02length || rawData.length === DATA02length25) {
						const xlsBinName = rawData.slice(64, 128),
							xlsCrc = byteSwap(prettify(crc16Calculator(xlsBinName), 4));
						// inject new checksum into binary array
						rawData[62] = parseInt(xlsCrc.slice(0, 2), 16);
						rawData[63] = parseInt(xlsCrc.slice(2, 4), 16);
						// construct new hex data for ODX container
						newData =
							newData.slice(0, 124) + xlsCrc + newData.slice(128, rawData.length * 2);
						// calc file checksum
						let fileCrc = -1;
						for (let i = 2; i < rawData.length; i += 2) {
							// convert two separate bytes into little endian short
							const ushort = rawData[i] + rawData[i + 1] * 256;
							fileCrc += ushort;
						}
						fileCrc = (fileCrc & 0xffff) ^ 0xffff;
						fileCrc = byteSwap(prettify(fileCrc, 4));
						// inject new checksum into binary array
						rawData[0] = parseInt(fileCrc.slice(0, 2), 16);
						rawData[1] = parseInt(fileCrc.slice(2, 4), 16);
						// construct new hex data for ODX container
						newData = fileCrc + newData.slice(4, rawData.length * 2);

						if (debug) {
							if (rawData.length === DATA02length) {
								console.log(clc.magenta(`GEN2 firmware`));
							} else {
								console.log(clc.magenta(`GEN2.5 firmware`));
							}
							console.log(clc.magenta(`DATA checksum  ${fileCrc}`));
							console.log(clc.magenta(`NAME checksum  ${xlsCrc}`));
						}
					}

					const { value: originalCrc, match: originalCrcMatch } =
							crc32Data[val.replace('FD_', 'DB_')],
						odxCrc = prettify(crc32Calculator(rawData), 8);
					data = data.replace(originalData, newData);
					data = data.replace(
						originalCrcMatch,
						originalCrcMatch.replace(originalCrc, odxCrc),
					);

					if (debug) {
						console.log(clc.magenta(`ODX  checksum  ${odxCrc}`));
					}
				}
			} catch (e) {
				console.log(clc.red(`error reading block ${val}.${format}`));
				console.log(e);
			}
		});

	if (writeFlag) {
		fs.writeFile(newFilename, data, (err) => {
			if (err) return console.log(err);
			console.log(clc.cyan(newFilename) + ` created`);
		});
	}
});
