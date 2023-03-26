import {
	// reactivity
	createSignal,
	createGettersForSignal,
	createProxyForSignal,
	createEffect,
	// context
	createContext,
	useContext,
	// component
	createComponent,
	mergeProps,
	onCleanup,
} from './@index.js'

import { createTag, Show } from './web.js'
import { ShowCollapse } from '../web/show-collapse.js'

/*
	todo
	- test with hash, in theory it should just work
	- add links params <A href="/users/:id" params={{ id: userId }} />  https://github.com/solidjs/solid-router/issues/216
	- lauto css on inks: exactMatch, partialMatch, noMatch
*/

// route

const RouteContext = createContext({
	base: '', // the composed base route
	href: '', // the url of the route
	route: '', // the regular expresion of this route
	childRoutes: [], // the children routes `showing` signals
	parent: null, // parent context
})
RouteContext.onBeforeLeave = []

export function Route(props) {
	const [show, setShow] = createSignal(false)

	const parent = useContext(RouteContext)

	parent.childRoutes.push(show)

	const path = parent.base + props.path
	const route = new RegExp(
		'^' + path.replace(/\:([a-z0-9_\-]+)/gi, '(?<$1>.+)'),
		'i',
	)

	let href = ''

	createEffect(() => {
		const path = location.path

		if (route.test(path)) {
			if (href === '') {
				href = path.replace(path.replace(route, ''), '')
				href =
					window.location.origin + (href[0] !== '/' ? '/' : '') + href
			}
			writeParams(route.exec(path).groups)
			setShow(true)
		} else {
			setShow(false)
		}
	})

	const context = {
		base: path,
		get href() {
			return href
		},
		route,
		childRoutes: [],
		parent,
	}
	return createComponent(RouteContext.Provider, {
		value: context,
		get children() {
			return createComponent(props.collapse ? ShowCollapse : Show, {
				get when() {
					return show()
				},
				get children() {
					onCleanup(() => {
						context.childRoutes = []
					})
					return props.when === undefined || props.when
						? props.component || props.element || props.children
						: props.fallback ||
								'Fallback Not Provided For When On Route'
				},
			})
		},
	})
}

// location

const [getLocation, setLocation] = createSignal(window.location, {
	equals: false,
})

const location = createGettersForSignal(getLocation, {
	get path() {
		return this.pathname + this.hash
	},
	get query() {
		const params = Object.create(null)
		new URL(this.href).searchParams.forEach((value, key) => {
			params[key] = value
		})
		return params
	},
})

export function useLocation() {
	return location
}

// params

const [getParams, setParams] = createSignal(Object.create(null))

function writeParams(params) {
	for (const key in params) {
		params[key] =
			params[key] !== undefined ? decode(params[key]) : params[key]
	}
	setParams(params)
}
function decode(s) {
	try {
		return decodeURIComponent(s) // malformed params will fail to decode
	} catch (e) {
		return s
	}
}

const params = createProxyForSignal(getParams)

export function useParams() {
	return params
}

// not found

export function NotFound(props) {
	const context = useContext(RouteContext)

	return createComponent(Show, {
		get when() {
			return context.childRoutes.every(show => !show())
		},
		get children() {
			return props.component || props.element || props.children
		},
	})
}

// Link

const Link = createTag('a')

export function A(props) {
	const href =
		props.href[0] === '/' ||
		props.href[0] === '#' ||
		/^http/.test(props.href)
			? props.href
			: new URL(props.href, useContext(RouteContext).href)

	return Link(mergeProps(props, { href }))
}

// navigate

async function canNavigate(href) {
	const newBeforeLeave = []
	for (const onBeforeLeave of RouteContext.onBeforeLeave) {
		if (href.indexOf(onBeforeLeave.href) !== 0) {
			if (!(await onBeforeLeave.cb())) return false
		} else {
			newBeforeLeave.push(onBeforeLeave)
		}
	}
	RouteContext.onBeforeLeave = newBeforeLeave
	return true
}
async function navigate(href, options = Object.create(null)) {
	if (window.location.href !== href) {
		if (await canNavigate(href)) {
			if (options.replace) {
				window.history.replaceState(null, null, href)
			} else {
				window.history.pushState(null, null, href)
			}
			setLocation(window.location)
			if (options.scroll === undefined || options.scroll) {
				scrollTo(window.location.hash)
			}
		}
	}
}

// when the user sets the url it may pass a relative path

function navigateUser(href, options = Object.create(null)) {
	navigate(
		/^http/.test(href)
			? href
			: new URL(href, window.location.href).href,
		options,
	)
}
export { navigateUser as navigate }

// scroll

function scrollTo(hash) {
	if (hash) {
		try {
			const item = document.querySelector(hash) // selector could be invalid
			return item && scrollToElement(item)
		} catch (e) {}
	}
	scrollToTop()
}
function scrollToElement(item) {
	item.scrollIntoView({ behavior: 'auto' })
}
function scrollToTop() {
	window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

// on before leave

export function useOnBeforeLeave(cb) {
	RouteContext.onBeforeLeave.push({
		href: useContext(RouteContext).href,
		cb,
	})
}

// listen link clicks

function onLinkClick(e) {
	if (
		e.defaultPrevented ||
		e.button !== 0 ||
		e.metaKey ||
		e.altKey ||
		e.ctrlKey ||
		e.shiftKey
	)
		return

	// find link
	const a = e
		.composedPath()
		.find(item => item instanceof HTMLAnchorElement)

	// validate
	if (
		!a ||
		!a.href ||
		a.download ||
		a.target ||
		// origin could be http://example.net and link could be http://example.net.ha.com
		(a.href + '/').indexOf(window.location.origin + '/') !== 0 ||
		(a.rel && a.rel.includes('external'))
	)
		return

	e.preventDefault()

	navigate(a.href, { replace: a.replace, scroll: !a.noscroll })
}

document.addEventListener('click', onLinkClick)
onCleanup(() => document.removeEventListener('click', onLinkClick)) // probably useless

// listen when using browser buttons

const onLocationChange = async function (state) {
	if (state.ignore) {
		state.ignore = false
	} else {
		if (await canNavigate(window.location.href)) {
			setLocation(window.location)
		} else {
			state.ignore = true
			history.back()
		}
	}
}.bind(null, { ignore: false })

addEventListener('hashchange', onLocationChange)
addEventListener('popstate', onLocationChange)
