const fs = require('fs');
const wav = require('node-wav');
const argv = require('minimist')(process.argv.slice(2));

if (!argv._.length) {
	console.log('No file name provided');
	return;
}

// Parameters for the data below
const {
	_: [filename, wavFilename = filename.replace(/\.[^/.]+$/, '.wav')],
	rate: sampleRate = 2048,
	factor: sampleFactor = 1,
	repeat: sampleRepeat = 2,
	columns = 16,
	stereo = false,
	delay: channelDelay = 0,
} = argv;

fs.readFile(filename, 'utf8', (err, data) => {
	if (err) return console.log(err);

	const table = data.split('\n').map((line) => line.split('\t'));
	const samples = [...Array(columns).keys()]
		.map((i) =>
			Array(sampleRepeat)
				.fill(table.map((vals) => parseInt(vals[i] / sampleFactor, 10)))
				.flat()
		)
		.flat();

	// mono
	let channels = [samples];
	// add second channel with some delay
	if (stereo) {
		channels.push([...samples.splice(1024 - channelDelay, channelDelay), ...samples]);
	}
	// console.log(channels);
	let buffer = wav.encode(channels, {
		sampleRate,
		float: false,
		bitDepth: 16,
	});
	fs.writeFile(wavFilename, buffer, (err) => {
		if (err) return console.log(err);

		console.log(`\x1b[36m${wavFilename} created\x1b[0m`);
	});
});
