export default function createLazyMemo(fn) {
	let invalid = true
	let value
	const track = createReaction(() => (invalid = true))

	return () => {
		if (invalid) {
			track(() => {
				value = fn()
				invalid = false
			})
		}
		return value
	}
}
