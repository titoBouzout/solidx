import { reconcile, modifyMutable } from 'solid-js/store'

export default function patchMutable(mutable, key, data) {
	if (mutable[key].id !== data.id) {
		mutable[key] = data
	} else {
		modifyMutable(mutable[key], reconcile(data))
	}
}
