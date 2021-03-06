import { isEngine, Plugin, PluginOptions } from '@aomao/engine';

export interface Options extends PluginOptions {
	hotkey?: string | Array<string>;
}
export default class extends Plugin<Options> {
	static get pluginName() {
		return 'redo';
	}

	execute() {
		if (!isEngine(this.editor)) return;
		if (!this.editor.readonly) this.editor.history.redo();
	}

	queryState() {
		if (!isEngine(this.editor) || this.editor.readonly) return;
		return this.editor.history.hasRedo();
	}

	hotkey() {
		return this.options.hotkey || ['mod+y', 'shift+mod+y'];
	}
}
