export default function createGetters(signal, source) {
	const props = Object.keys(untrack(signal))
	source = source || Object.create(null)
	for (const prop of props) {
		Object.defineProperty(source, prop, {
			get() {
				return signal()[prop]
			},
		})
	}
	return source
}
