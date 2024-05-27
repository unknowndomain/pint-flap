require('dotenv-safe').config()
const { WebSocket } = require('ws')
const moment = require('moment')

const ws_url = `ws://${process.env.WS_HOST}:${process.env.WS_PORT}`
const ws = new WebSocket(ws_url)
console.log(`Connecting to: ${ws_url}`)

let next_update = moment().add(10, 'seconds')
let pints_sold = 0
let last_screen = ""

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
	// console.log('updateScreen')
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
		console.log(`Screen should be updated to: "${screen}"`)
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


