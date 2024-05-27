require('dotenv-safe').config()

const {SerialPort} = require('serialport')
const {WebSocket} = require('ws')
const moment = require('moment')

const ws_url = `ws://${process.env.WS_HOST}:${process.env.WS_PORT}`
const ws = new WebSocket(ws_url)
console.log(`Connecting to: ${ws_url}`)

let next_update = moment().add(10, 'seconds')
let pints_sold = 0
let last_screen = ""

let serial
let pos = 0

const packet = Buffer.alloc( 6 )
packet.writeInt8( 2, 0 )	// STX
packet.writeInt8( 4, 2 )	// CMD
packet.writeInt8( 3, 5 )	// ETX

const sessions = require('./sessions.json')

// Connect
ws.on('open', () => {
	ws.send('SUBSCRIBE totals/by-unit')
})

// Log unhandled errors
ws.on('error', console.error)

// Deal with incoming data
ws.on('message', (data) => {
	let json = JSON.parse(data)
	const units = Object.keys(json.units)

	if (json.units[process.env.UNIT_OF_INTEREST]) {
		const pints = Number.parseFloat(json.units[process.env.UNIT_OF_INTEREST])
		pints_sold = Math.round(pints)
	}
})

// Check if it's time to update
setInterval(() => {
	if (moment().isAfter(next_update)) {
		updateScreen()
	}
}, 100)

function updateScreen() {
	let screen = ""

	if (!inSession() || pints_sold == 0) {
		screen = "EMF*"
	} else {
		if (pints_sold <= 9999) {
			screen = pints_sold.toString().padStart(4, '0')
		} else if (pints_sold < 10100) {
			screen = "10K!"
		} else if (pints_sold <= 99999) {
			let kilo_pints_sold = (pints_sold / 1000).toFixed(1)
			screen = kilo_pints_sold.toString().replace('.', 'K')
		} else {
			screen = "$$$$"
		}
	}

	// Only update the screen if it's actually different from the last update
	if (screen != last_screen) {
		sendToScreen(screen)
		next_update = moment().add(process.env.UPDATE_RATE_LIMIT, 'seconds')
		console.log(`Next update at: ${next_update}`)
	}

	last_screen = screen
}

function getCurrentSession() {
	let output = null
	sessions.forEach(s => {
		if (moment().isBetween(s.opening_time, s.closing_time)) output = s
	})
	return output
}

function inSession() {
	return getCurrentSession() == null ? false : true
}

function sendToScreen(screen) {
	console.log(`Screen = ${screen}`)

	for (let i = 0; i < screen.length; i++) {
		setTimeout(() => {
			packet.writeInt8(pos + 1, 1)	// ADDR
			packet.write(screen[pos], 3)	// VAR
			packet.writeInt8((packet.readInt8(0) ^ packet.readInt8(1) ^ packet.readInt8(2) ^ packet.readInt8(3) ^ packet.readInt8(5)), 4)
			serial.write(packet, (err, result) => {}, 1000)
			pos++;
		}, 100 * i )
	}
}

SerialPort.list().then((ports) => {
	console.log(ports)
	ports.forEach((port) => {
		if ((port.locationId == '01100000' ) && ! serial) {
			console.log(`\nConnecting to: ${port.path}`)

			serial = new SerialPort({
				path: port.path,
				baudRate: 9600
			})

			serial.on('open', ready)
		}
	})
})
