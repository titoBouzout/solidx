import Client from 'angelia.io/client'
import storage from '@titodp/storage'
import Events from '@lib/events'
import state from '@js/state'

// connect

let socket = new Client({
	url: state.local
		? 'ws://' + location.hostname + ':3001'
		: 'wss://s.' + location.hostname,
	params: function () {
		return {
			username: storage.username || null,
			color: storage.color || null,
			roomID: state.roomID || 'lobby',
			lang: navigator.languages,
		}
	},
})

socket.rtc = {
	connections: new Set(),
	events: new Events(),
	chunkID: 0,
	chunkSize: 1024 * 16,
	create(configuration) {
		let pc = new RTCPeerConnection(configuration)

		pc.channel = pc.createDataChannel('chat', {
			negotiated: true,
			id: 0,
		})
		pc.channel.queue = []
		pc.channel.incoming = {}

		pc.channel.addEventListener('message', event => {
			let data = JSON.parse(event.data)
			if (data.chunk) {
				let id = data.id
				if (!pc.channel.incoming[id]) pc.channel.incoming[id] = ''
				pc.channel.incoming[id] += data.chunk
				if (!data.end) return
				let msg = JSON.parse(pc.channel.incoming[id])
				delete pc.channel.incoming[id]
				this.events.emit(msg.k, msg.v, pc)
			} else {
				this.events.emit(data.k, data.v, pc)
			}
		})
		pc.channel.addEventListener('bufferedamountlow', event => {
			if (pc.channel.queue.length)
				this.send(pc, pc.channel.queue.shift())
		})
		// should send queued messages on open
		pc.channel.addEventListener('open', event => {
			if (pc.channel.queue.length)
				this.send(pc, pc.channel.queue.shift())
		})

		let onClose = () => {
			if (
				pc.connectionState === 'closed' ||
				pc.signalingState === 'closed'
			) {
				this.connections.delete(pc)
				pc = null
			}
		}

		pc.channel.addEventListener('close', onClose)
		pc.addEventListener('signalingstatechange', onClose)
		pc.addEventListener('connectionstatechange', onClose)
		pc.emit = (k, v) => {
			let msg = JSON.stringify({ k, v })

			if (msg.length > this.chunkSize) {
				let messages = this.chunkMessages(msg, this.chunkSize)

				for (let msg of messages) {
					this.send(pc, msg)
				}
			} else {
				this.send(pc, msg)
			}
		}
		this.connections.add(pc)

		return pc
	},

	on(k, cb) {
		return this.events.on(k, cb)
	},
	broadcast(k, v) {
		let msg = JSON.stringify({ k, v })

		if (msg.length > this.chunkSize) {
			let messages = this.chunkMessages(msg, this.chunkSize)
			for (let pc of this.connections) {
				for (let msg of messages) {
					this.send(pc, msg)
				}
			}
		} else {
			for (let pc of this.connections) {
				this.send(pc, msg)
			}
		}
	},
	emit(k, v) {
		this.broadcast(k, v)
		this.events.emit(k, v)
	},
	send(pc, data) {
		if (
			pc.channel.readyState !== 'open' ||
			pc.channel.bufferedAmount >
				pc.channel.bufferedAmountLowThreshold
		) {
			pc.channel.queue.push(data)
			return
		}
		pc.channel.send(data)
	},

	chunkMessages(msg, chunkSize) {
		let chunks = this.createChunks(msg, chunkSize)
		let id = this.chunkID++
		let messages = []
		for (let i = 0, len = chunks.length - 1; i <= len; i++) {
			messages.push(
				JSON.stringify({
					id,
					chunk: chunks[i],
					end: i === chunks.length - 1 ? 1 : undefined,
				}),
			)
		}
		return messages
	},
	createChunks(str, size) {
		const numChunks = Math.ceil(str.length / size)
		const chunks = new Array(numChunks)

		for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
			chunks[i] = str.substr(o, size)
		}

		return chunks
	},
}

if ('__IS_LOCALHOST__') console.log(socket)

export default socket
