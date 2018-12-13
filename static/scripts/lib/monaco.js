/* global monaco, Map, Set, Promise */
/* eslint no-var: 0, no-console: 0 */
/* eslint-env es6 */

import { closeOpenTab } from './tab-controller.js';
import { promptForOpen, saveTextFileFromEditor } from './files.js';
import BufferFile from './buffer-file.js'
import debounce from 'lodash.debounce';

var settings = {
	theme: 'web-code',
	fontSize: 9,
	fontLigatures: true,
	fontFamily: '"courier"'
}
var settingsKeys = Object.keys(settings);

function monacoSettings(inObj) {
	inObj = inObj || {};
	settingsKeys.forEach(function (key) {
		if (inObj[key] === undefined) {
			inObj[key] = settings[key];
		}
	})
	return inObj;
}

require.config({ paths: { 'vs': 'vs' } });

var monacoPromise = new Promise(function (resolve) {
	require(['vs/editor/editor.main'], resolve);
})
.then(function () {
	monaco.editor.defineTheme('web-code', {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{ token: 'comment', foreground: 'ffa500', fontStyle: 'italic' },
			{ token: 'punctuation.definition.comment', fontStyle: 'italic' },
			{ token: 'constant.language.this.js', fontStyle: 'italic' },
			{ token: 'variable.language', fontStyle: 'italic' },
			{ token: 'entity.other.attribute-name', fontStyle: 'italic' },
			{ token: 'tag.decorator.js', fontStyle: 'italic' },
			{ token: 'entity.name.tag.js,', fontStyle: 'italic' },
			{ token: 'tag.decorator.js', fontStyle: 'italic' },
			{ token: 'punctuation.definition.tag.js', fontStyle: 'italic' },
			{ token: 'source.js', fontStyle: 'italic' },
			{ token: 'constant.other.object.key.js', fontStyle: 'italic' },
			{ token: 'string.unquoted.label.js', fontStyle: 'italic' },
		]
	});	
});

function getMonacoLanguageFromMimes(mime) {
	return (monaco.languages.getLanguages().filter(function (languageObj) {
		return languageObj.mimetypes && languageObj.mimetypes.includes(mime);
	})[0] || {})['id'];
}

function getMonacoLanguageFromExtensions(extension) {
	return (monaco.languages.getLanguages().filter(function (languageObj) {
		return languageObj.extensions && languageObj.extensions.includes(extension);
	})[0] || {})['id'];
}

function selectNextEl() {
	document.querySelector('a, button, [tabindex]').focus();
}

function selectPreviousEl() {
	document.querySelectorAll('a, button, [tabindex]').focus();
}

function nextTab() {
	console.log('STUB: FOCUS NEXT TAB');
}

function previousTab() {
	console.log('STUB: FOCUS PREVIOUS TAB');
}

function addBindings(editor, tab) {
	editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_O, promptForOpen);
	editor.addCommand(monaco.KeyCode.KEY_W | monaco.KeyMod.CtrlCmd, closeOpenTab);
	editor.addCommand(monaco.KeyCode.F6, selectNextEl);
	editor.addCommand(monaco.KeyCode.F6 | monaco.KeyMod.Shift, selectPreviousEl);
	editor.addCommand(monaco.KeyCode.Tab | monaco.KeyMod.CtrlCmd, nextTab);
	editor.addCommand(monaco.KeyCode.Tab | monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd, previousTab);
	editor.addCommand(monaco.KeyCode.KEY_P | monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd, function openCommandPalette() {
		editor.trigger('anyString', 'editor.action.quickCommand');
	});
	editor.addCommand(monaco.KeyCode.Tab, function() {
		selectNextEl();
	}, 'hasJustTabbedIn')

	editor.webCodeState = {};
	editor.webCodeState.savedAlternativeVersionId = editor.model.getAlternativeVersionId();
	editor.webCodeState.tab = tab;
	editor.webCodeState.hasJustTabbedIn = editor.createContextKey('hasJustTabbedIn', false);

	editor.webCodeState.functions = {
		checkForChanges: function checkForChanges() {
			editor.webCodeState.hasJustTabbedIn.set(false);
			var hasChanges = editor.webCodeState.savedAlternativeVersionId !== editor.model.getAlternativeVersionId();
			editor.webCodeState.hasChanges = hasChanges;
			tab.el.classList.toggle('has-changes', hasChanges);
		}
	}

	var writeToDB = debounce(function writeToDB() {
		if (tab.stats.constructor === BufferFile) {
			tab.stats.update(editor.getValue()).then(function () {
				editor.webCodeState.savedAlternativeVersionId = editor.model.getAlternativeVersionId();
				editor.webCodeState.functions.checkForChanges();
			});
		}
	}, 500);

	editor.onDidChangeModelContent(function () {
		writeToDB();
		editor.webCodeState.functions.checkForChanges();
	});

	editor.onDidFocusEditor(function () {
		editor.webCodeState.hasJustTabbedIn.set(true);
	});
	editor.onMouseDown(function () {
		editor.webCodeState.hasJustTabbedIn.set(false);
	});

	editor.addAction({
		id: 'web-code-save-tab',
		label: 'Save File',
		keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
		keybindingContext: null,
		run: function () {
			saveTextFileFromEditor(tab.stats, editor);
		}
	});
}

export { monacoPromise, getMonacoLanguageFromExtensions, getMonacoLanguageFromMimes, addBindings, monacoSettings };
