require('dotenv-safe').config()
const { WebSocketServer } = require('ws')
const wss = new WebSocketServer({
	port: process.env.WS_PORT
})

console.log(`WSS started on: ws://localhost:${process.env.WS_PORT}`)

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

	interval = setInterval(() => {
		let output = data

		units.forEach((u, i) => {
			values[i] += Math.random() * 10
			output.units[u] = values[i].toFixed(1)
		})

		ws.send(JSON.stringify(data))
	}, 5000)
})
