const fs = require('fs');
const clc = require('cli-color');
const argv = require('minimist')(process.argv.slice(2));

if (!argv._.length) {
	console.log('No file name provided');
	return;
}

const {
	_: [filename],
	format = 'bin',
} = argv;

fs.readFile(filename, 'utf8', (err, data) => {
	if (err) return console.log(err);

	const names = [...data.matchAll(/<FLASHDATA.*?ID=".*?\.(\S+)"/gim)].map((val) => val[1]),
		hexData = [...data.matchAll(/<DATA>(\S+)<\/DATA>/gims)].map((val) => val[1]);

	names.map((val, i) => {
		if (val.indexOf('ERASE') === -1) {
			const blockFilename = `${filename}.${val}.${format}`;
			fs.writeFile(
				blockFilename,
				format === 'bin'
					? Uint8Array.from(hexData[i].match(/(..)/g).map((val) => parseInt(val, 16)))
					: hexData[i],
				(err) => {
					if (err) return console.log(err);
					console.log(clc.cyan(`${blockFilename}`) + `\tcreated`);
				}
			);
		}
	});
});
