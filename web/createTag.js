export function createTag(tagName) {
	return props => DynamicComponent(tagName, props)
}
