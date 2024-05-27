require('dotenv-safe').config()

const keypress = require('keypress')
keypress(process.stdin)

const { WebSocket, WebSocketServer } = require('ws')
const wss = new WebSocketServer({
	port: process.env.WS_PORT
})

console.log(`WSS started on: ws://localhost:${process.env.WS_PORT}`)
console.log(`Press q to exit.`)
console.log(`Press any other key to add a random number of pints to the total.`)

let units = ["Can", "25ml measure", "Bottle (not wine)", "Can", "Pint (draught)", "Pint (from carton)", "Wine bottle"]
let values = []
const data = {
	"type": "totals by unit",
	"key": "totals/by-unit",
	"units": {}
}

units.forEach(u => {
	values.push(0.0)
})

wss.on('connection', (ws) => {
	ws.on('error', console.error);

	ws.on('message', (data) => {
		const str = data.toString()
		const result = Array.from(str.matchAll(/^(UNSUBSCRIBE|SUBSCRIBE) (.+)$/g))

		if (result[0]) {
			if (result[0][1] == 'SUBSCRIBE') {
				console.log(`Subscribe: ${result[0][2]}`)
			} else if (result[0][1] == 'UNSUBSCRIBE') {
				console.log(`Unsubscribe: ${result[0][2]}`)
			}
		} else {
			console.log(`Unknown command: ${data.toString()}`)
		}
	})
})

function sendUpdate(data) {
	const json = JSON.stringify(data)
	console.log(`Sending JSON...`)
	console.log(data.units)
	wss.clients.forEach(c => {
		if (c.readyState === WebSocket.OPEN) {
			c.send(json)
		}
	})
}

process.stdin.setRawMode(true)
process.stdin.on('keypress', (ch, key) => {
	if (ch == 'q') process.exit()
	let output = data

	let multiplier = Number.parseInt(ch)

	if (isNaN(multiplier)) {
		multiplier = 5
	}
	if (multiplier == 0) {
		multiplier = 100
	}

	units.forEach((u, i) => {
		const addition = Math.random() * multiplier
		values[i] += addition
		output.units[u] = values[i].toFixed(1)
	})

	sendUpdate(data)
})
