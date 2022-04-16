const fs = require('fs');
const polycrc = require('polycrc');
const argv = require('minimist')(process.argv.slice(2));

if (!argv._.length) {
	console.log('No file name provided');
	return;
}

const {
	_: [filename, newFilename = filename.replace('.odx', '.MODIFIED.odx')],
	format = 'bin',
} = argv;

fs.readFile(filename, 'utf8', (err, data) => {
	if (err) return console.log(err);

	const names = [...data.matchAll(/<FLASHDATA.*?ID=".*?\.(\S+)"/gim)].map((val) => val[1]),
		hexData = [...data.matchAll(/<DATA>(\S+)<\/DATA>/gims)].map((val) => val[1]),
		crc32Data = {};

	[...data.matchAll(/<FW-CHECKSUM.*?>(\S+?)<\/FW-CHECKSUM>.*?<VALIDITY-FOR.*?>(\S+?)<\/VALIDITY-FOR>/gims)].map(
		(val) => (crc32Data[val[2]] = { value: val[1], match: val[0] })
	);

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
							.map((val) => parseInt(val, 16))
					);
				}
				const newData = [...rawData].map((char) => char.toString(16).toUpperCase().padStart(2, '0')).join('');

				if (originalData === newData) {
					console.log(`\x1b[33m${val}.${format} block not changed\x1b[0m`);
				} else {
					writeFlag = true;

					const { value: originalCrc, match: originalCrcMatch } = crc32Data[val.replace('FD_', 'DB_')],
						adlatusCalculator = polycrc.crc(32, 0x04c11db7, 0, 0, true), // size, poly, init, xorout, refin/refout
						newCrc = adlatusCalculator(rawData).toString(16).toUpperCase().padStart(8, '0');

					data = data.replace(originalData, newData);
					data = data.replace(originalCrcMatch, originalCrcMatch.replace(originalCrc, newCrc));
					console.log(`\x1b[32m${val}.${format} block was updated, new crc: ${newCrc}\x1b[0m`);
				}
			} catch (e) {
				console.log(`\x1b[31merror reading block ${val}.${format}\x1b[0m`);
				console.log(e);
			}
		});

	if (writeFlag) {
		fs.writeFile(newFilename, data, (err) => {
			if (err) return console.log(err);

			console.log(`\n\x1b[36m${newFilename} created\x1b[0m`);
		});
	}
});
