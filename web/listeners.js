// resize
import events from './events'

events.create('resize', function resize(emit) {
	window.addEventListener('resize', function () {
		emit()
	})
	Promise.resolve().then(emit)
})

// document focused

events.create('focused', function visibility(emit) {
	let focused = !document.hidden

	function onFocusChange(e) {
		if (e.target == e.currentTarget) {
			focused = e.type === 'blur' ? false : true
			emit(focused)
		}
	}

	document.addEventListener('focus', onFocusChange)
	document.addEventListener('blur', onFocusChange)
	window.addEventListener('focus', onFocusChange)
	window.addEventListener('blur', onFocusChange)

	Promise.resolve().then(() => emit(focused))
})

// document visible

events.create('visible', function visibility(emit) {
	let visible = !document.hidden

	document.addEventListener('visibilitychange', function () {
		visible = document.visibilityState === 'visible'
		emit(visible)
	})

	Promise.resolve().then(() => emit(visible))
})

events.create('keydown', function keydown(emit) {
	document.addEventListener('keydown', emit, false)
})

events.create('keyup', function keyup(emit) {
	document.addEventListener('keyup', emit, false)
})

events.create('click', function click(emit) {
	document.addEventListener('click', emit, { passive: true })
})

events.create('unload', function unload(emit) {
	document.addEventListener('unload', emit, false)
})

events.create('fullscreen', function fullscreen(emit) {
	document.addEventListener('fullscreenchange', emit, false)
})
