const fs = require('fs');
const polycrc = require('polycrc');
const Hashes = require('jshashes');
const argv = require('minimist')(process.argv.slice(2));

if (!argv._.length) {
	console.log('No file name provided');
	return;
}

const { _: filenames } = argv;
let content = [],
	crcs = [],
	combinedContent = '';

const arr2string = (arr) => arr.map((char) => String.fromCharCode(char)).join('');
const crc2string = (crc) => crc.toString(16).toUpperCase().padStart(4, '0');
const byte_switch = (str) => str.slice(2, 4) + str.slice(0, 2);
//const crc16 = polycrc.crc(16, 0x1021, 0, 0, true);
const crc16 = polycrc.crc(16, 0x1021, 0xffff, 0, false);

const reverseBits = (num) => {
	let reversed = num.toString(2);
	const padding = '0';
	reversed = padding.repeat(16 - reversed.length) + reversed;
	return parseInt(reversed.split('').reverse().join(''), 2);
};
const MD5 = new Hashes.MD5(),
	SHA1 = new Hashes.SHA1(),
	SHA256 = new Hashes.SHA256(),
	SHA512 = new Hashes.SHA512(),
	RMD160 = new Hashes.RMD160();

String.prototype.splice = function (idx, rem, str) {
	return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};

// 8S__0004 : 47 8E
// 3G__0006 : 26 5B
// 5G__0014 : 0F 93

filenames.map((filename, index) => {
	try {
		let data = fs.readFileSync(filename);
		let dataArray = [...data];

		if (index === 0) {
			const xlsFilename = arr2string(dataArray.slice(64, 128));
			const xlsCrc = crc2string(crc16(xlsFilename)),
				xlsCrcByteSwitch = byte_switch(xlsCrc);
			console.log(
				`XLS:\n${xlsFilename}\nCRC16:  \x1b[32m${xlsCrc}\x1b[0m byte_switch \x1b[31m${xlsCrcByteSwitch} \x1b[0m`
			);

			dataArray = dataArray.slice(2);
			// dataArray = dataArray.slice(4);
			// dataArray = [0, 0, ...dataArray.slice(2)];
			// dataArray = [0xff, 0xff, ...dataArray.slice(2)];
		}
		let dataString = arr2string(dataArray);
		content.push(dataString);
		crcs.push(crc16(dataString));

		console.log(
			`\n${filename}\ndata length: %i\nCRC16:  \x1b[32m%s\x1b[0m xor \x1b[33m%s\x1b[0m rev \x1b[34m%s\x1b[0m r+x \x1b[35m%s\x1b[0m`,
			dataArray.length,
			crc2string(crc16(dataString)),
			crc2string(crc16(dataString) ^ 0xffff),
			crc2string(reverseBits(crc16(dataString))),
			crc2string(reverseBits(crc16(dataString) ^ 0xffff))
		);
		const md5 = MD5.hex(dataString),
			sha1 = SHA1.hex(dataString),
			sha256 = SHA256.hex(dataString),
			rmd160 = RMD160.hex(dataString);

		console.log(
			`MD5:    %s\x1b[0m\t\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
			md5.toUpperCase().splice(-4, 0, '\x1b[32m'),
			crc2string(parseInt(md5.slice(-4), 16) ^ 0xffff),
			crc2string(reverseBits(parseInt(md5.slice(-4), 16))),
			crc2string(reverseBits(parseInt(md5.slice(-4), 16) ^ 0xffff))
		);
		console.log(
			`SHA1:   %s\x1b[0m\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
			sha1.toUpperCase().splice(-4, 0, '\x1b[32m'),
			crc2string(parseInt(sha1.slice(-4), 16) ^ 0xffff),
			crc2string(reverseBits(parseInt(sha1.slice(-4), 16))),
			crc2string(reverseBits(parseInt(sha1.slice(-4), 16) ^ 0xffff))
		);
		console.log(
			`SHA256: %s\x1b[0m \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
			sha256.toUpperCase().splice(-4, 0, '\x1b[32m'),
			crc2string(parseInt(sha256.slice(-4), 16) ^ 0xffff),
			crc2string(reverseBits(parseInt(sha256.slice(-4), 16))),
			crc2string(reverseBits(parseInt(sha256.slice(-4), 16) ^ 0xffff))
		);
		console.log(
			`RMD160: %s\x1b[0m\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
			rmd160.toUpperCase().splice(-4, 0, '\x1b[32m'),
			crc2string(parseInt(rmd160.slice(-4), 16) ^ 0xffff),
			crc2string(reverseBits(parseInt(rmd160.slice(-4), 16))),
			crc2string(reverseBits(parseInt(rmd160.slice(-4), 16) ^ 0xffff))
		);
	} catch (err) {
		console.log(err);
	}
});
const combined = content.join('');
console.log(
	`\nCOMBINED\ndata length: %i\nCRC16:  \x1b[32m%s\x1b[0m xor \x1b[33m%s\x1b[0m rev \x1b[34m%s\x1b[0m r+x \x1b[35m%s\x1b[0m`,
	combined.length,
	crc2string(crc16(combined)),
	crc2string(crc16(combined) ^ 0xffff),
	crc2string(reverseBits(crc16(combined))),
	crc2string(reverseBits(crc16(combined) ^ 0xffff))
);

const md5 = MD5.hex(combined),
	sha1 = SHA1.hex(combined),
	sha256 = SHA256.hex(combined),
	rmd160 = RMD160.hex(combined);

console.log(
	`MD5:    %s\x1b[0m\t\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
	md5.toUpperCase().splice(-4, 0, '\x1b[32m'),
	crc2string(parseInt(md5.slice(-4), 16) ^ 0xffff),
	crc2string(reverseBits(parseInt(md5.slice(-4), 16))),
	crc2string(reverseBits(parseInt(md5.slice(-4), 16) ^ 0xffff))
);
console.log(
	`SHA1:   %s\x1b[0m\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
	sha1.toUpperCase().splice(-4, 0, '\x1b[32m'),
	crc2string(parseInt(sha1.slice(-4), 16) ^ 0xffff),
	crc2string(reverseBits(parseInt(sha1.slice(-4), 16))),
	crc2string(reverseBits(parseInt(sha1.slice(-4), 16) ^ 0xffff))
);
console.log(
	`SHA256: %s\x1b[0m \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
	sha256.toUpperCase().splice(-4, 0, '\x1b[32m'),
	crc2string(parseInt(sha256.slice(-4), 16) ^ 0xffff),
	crc2string(reverseBits(parseInt(sha256.slice(-4), 16))),
	crc2string(reverseBits(parseInt(sha256.slice(-4), 16) ^ 0xffff))
);
// console.log(`SHA512: %s\x1b[0m `, SHA512.hex(combined).splice(-4, 0, '\x1b[32m'));
console.log(
	`RMD160: %s\x1b[0m\t\t\t \x1b[33m%s\x1b[0m \x1b[34m%s\x1b[0m \x1b[35m%s\x1b[0m`,
	rmd160.toUpperCase().splice(-4, 0, '\x1b[32m'),
	crc2string(parseInt(rmd160.slice(-4), 16) ^ 0xffff),
	crc2string(reverseBits(parseInt(rmd160.slice(-4), 16))),
	crc2string(reverseBits(parseInt(rmd160.slice(-4), 16) ^ 0xffff))
);
