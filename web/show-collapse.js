import { children, createEffect } from './@index.js'
import { createTag } from './web.js'

// as Show but doesnt remove the children from the DOM

customElements.define(
	'solidx-show-collapse',
	class extends HTMLElement {
		constructor() {
			super(), this.attachShadow({ mode: 'open' }), this.hide()
		}
		hide() {
			this.shadowRoot.innerHTML = `<template><slot/></template>`
		}
		show() {
			this.shadowRoot.innerHTML = `<slot/>`
		}
		attributeChangedCallback(name, oldValue, newValue) {
			newValue === 'true' ? this.show() : this.hide()
		}
		static get observedAttributes() {
			return ['when']
		}
	},
)

let WebComponent = createTag('solidx-show-collapse')

export function ShowCollapse(props) {
	const child = children(() => props.children)

	const element = WebComponent({
		children: child,
	})()

	createEffect(() => {
		element.setAttribute('when', props.when)
	})
	return element
}

/*
function Collapse(props) {
	const child = children(() => props.children)

	return () =>
		child.toArray().map(node => {
			// set display none to html elements
			if (node.nodeType === 1) {
				const style = node.style
				if (props.when) {
					// save default display value
					style.setProperty(
						'--x-route-value',
						style.getPropertyValue('display'),
					)
					style.setProperty(
						'--x-route-priority',
						style.getPropertyPriority('display'),
					)
					// set display value to none
					style.setProperty('display', 'none', 'important')
				} else {
					// restore original display value
					style.setProperty(
						'display',
						style.getPropertyValue('--x-route-value'),
						style.getPropertyValue('--x-route-priority'),
					)
				}
			} else {
				// need to remove text nodes
				if (props.when) {
					return null
				}
			}
			return node
		})
}*/
