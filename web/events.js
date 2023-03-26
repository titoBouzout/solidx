export default class Events {
	constructor() {
		this.events = {}
	}

	on(id, fn) {
		this.events[id] = this.events[id] || new Set()
		this.events[id].add(fn)

		return () => this.events[id].delete(fn)
	}
	once(id, fn) {
		let off = this.on(id, () => {
			off()
			fn()
		})
		return off
	}

	emit(id, ...data) {
		if (this.events[id]) {
			for (let fn of this.events[id]) fn && fn(...data)
		}
	}

	create(id, fn) {
		fn(data => {
			this.emit(id, data)
		})
	}

	stop(e) {
		e.preventDefault()
		e.stopPropagation()
	}
}
