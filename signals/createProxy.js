export default function createProxy(signal, source) {
	return new Proxy(source || Object.create(null), {
		get(target, prop, receiver) {
			return signal()[prop]
		},
	})
}
