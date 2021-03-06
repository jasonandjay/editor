import { NodeInterface } from '../types/node';
import { DATA_ELEMENT, EDITABLE } from '../constants/root';
import { EditorInterface } from '../types/engine';
import {
	SchemaInterface,
	isNodeEntry,
	ParserInterface,
	Callbacks,
	ConversionInterface,
	ConversionRule,
	SchemaRule,
} from '../types';
import { CARD_ELEMENT_KEY, CARD_KEY, READY_CARD_KEY } from '../constants';
import {
	escape,
	unescape,
	removeUnit,
	toHex,
	transformCustomTags,
	getListStyle,
	getWindow,
} from '../utils';
import TextParser from './text';
import { $ } from '../node';

const style = {
	'font-size': '14px',
	color: '#262626',
	'line-height': '24px',
	'letter-spacing': '.05em',
	'outline-style': 'none',
	'overflow-wrap': 'break-word',
};

const escapeAttr = (value: string) => {
	return value
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

const attrsToString = (attrs: { [k: string]: string }) => {
	let attrsString = '';
	Object.keys(attrs).forEach((key) => {
		if (key === 'style') {
			return;
		}
		const val = escapeAttr(attrs[key]);
		attrsString += ' '.concat(key, '="').concat(val, '"');
	});
	return attrsString.trim();
};

const stylesToString = (styles: { [k: string]: string }) => {
	let stylesString = '';
	Object.keys(styles).forEach((key) => {
		let val = escape(styles[key]);

		if (
			/^(padding|margin|text-indent)/.test(key) &&
			removeUnit(val) === 0
		) {
			return;
		}

		if (/[^a-z]color$/.test(key)) {
			val = toHex(val);
		}

		stylesString += ' '.concat(key, ': ').concat(val, ';');
	});
	return stylesString.trim();
};

class Parser implements ParserInterface {
	private root: NodeInterface;
	private editor: EditorInterface;
	constructor(
		source: string | Node | NodeInterface,
		editor: EditorInterface,
		paserBefore?: (node: NodeInterface) => void,
	) {
		this.editor = editor;
		const { node } = this.editor;
		if (typeof source === 'string') {
			source = source.replace(/<a\s{0,1000}\/>/gi, '<a></a>');
			source = source.replace(/<a(\s[^>]+?)\/>/gi, (_, t) => {
				return '<a'.concat(t, '></a>');
			});
			// bugfix?????? p ????????? div ????????? DOMParser ????????????
			// <p><div>foo</div></p>
			// ??????
			// <p></p><div>foo</div><p></p>
			source = source
				.replace(/<p(>|\s+[^>]*>)/gi, '<paragraph$1')
				.replace(/<\/p>/gi, '</paragraph>');
			source = transformCustomTags(source);
			const doc = new (getWindow().DOMParser)().parseFromString(
				source,
				'text/html',
			);
			this.root = $(doc.body);
			const p = $('<p></p>');
			this.root.find('paragraph').each((child) => {
				const cNode = $(child);
				const pNode = p.clone();
				const attributes = cNode.attributes();
				Object.keys(attributes).forEach((name) => {
					pNode.attributes(name, attributes[name]);
				});
				node.replace(cNode, pNode);
			});
		} else if (isNodeEntry(source)) {
			this.root = source;
		} else {
			this.root = $(source);
		}
		if (paserBefore) paserBefore(this.root);
	}
	normalize(
		root: NodeInterface,
		schema: SchemaInterface,
		conversion: ConversionInterface | null,
	) {
		const nodeApi = this.editor.node;
		const inlineApi = this.editor.inline;
		const markApi = this.editor.mark;
		//????????????????????? mark ??? inline ??????
		root.allChildren().forEach((child) => {
			let node = $(child);
			if (node.isElement()) {
				//????????????
				if (conversion) {
					let value = conversion.transform(node);
					const oldRules: Array<ConversionRule> = [];
					while (value) {
						const { rule } = value;
						oldRules.push(rule);
						const { name, attributes, style } = value.node;
						const newNode = $(`<${name} />`);
						nodeApi.setAttributes(newNode, {
							...attributes,
							style,
						});
						//?????????????????????????????????????????????
						newNode.append(node.children());
						if (
							node.attributes(CARD_KEY) ||
							node.attributes(READY_CARD_KEY)
						) {
							node.before(newNode);
							node.remove();
							value = undefined;
							continue;
						} else {
							//??????????????????????????????????????????????????????
							node.append(newNode);
						}
						//??????????????????????????????????????????
						value = conversion.transform(
							node,
							(r) => oldRules.indexOf(r) < 0,
						);
					}
				}
				if (
					node.attributes(CARD_KEY) ||
					node.attributes(READY_CARD_KEY)
				)
					return;
				//??????
				const filter = (node: NodeInterface) => {
					//????????????????????????
					const attributes = node.attributes();
					const style = node.css();
					delete attributes.style;
					//????????????????????????????????????????????????
					schema.filter(node, attributes, style);
					//??????????????????
					const newNode = node.clone();
					//?????? data-id???????????????????????????????????????????????????
					newNode.removeAttributes('data-id');
					//?????????????????????????????????????????????????????????????????????????????????
					Object.keys(attributes).forEach((name) => {
						if (attributes[name]) {
							newNode.removeAttributes(name);
						}
					});
					Object.keys(style).forEach((name) => {
						if (style[name]) {
							newNode.css(name, '');
						}
					});
					if (newNode.attributes('style').trim() === '')
						newNode.removeAttributes('style');
					return newNode;
				};
				//??????????????? inline ?????????inline ???????????????????????????????????????mark??????
				if (nodeApi.isInline(node) && node.name !== 'br') {
					const parentInline = inlineApi.closest(node);
					//???????????????
					if (
						!parentInline.equal(node) &&
						nodeApi.isInline(parentInline)
					) {
						nodeApi.unwrap(node);
					}
					//???????????????mark
					else {
						const parentMark = markApi.closest(node);
						if (
							!parentMark.equal(node) &&
							nodeApi.isMark(parentMark)
						) {
							const cloneMark = parentMark.clone();
							const inlineMark = node.clone();
							parentMark.children().each((markChild) => {
								if (node.equal(markChild)) {
									nodeApi.wrap(
										nodeApi.replace(node, cloneMark),
										inlineMark,
									);
								} else {
									nodeApi.wrap(markChild, cloneMark);
								}
							});
							nodeApi.unwrap(parentMark);
						}
					}
				}
				//??????????????? mark ??????
				if (nodeApi.isMark(node)) {
					//???????????????mark??????????????????????????????????????????????????????????????????
					const oldRules: Array<SchemaRule> = [];
					let rule = schema.getRule(node);
					if (rule) {
						oldRules.push(rule);
						let newNode = filter(node);
						//?????????????????????????????????????????????????????????????????????????????????
						let type = schema.getType(
							newNode,
							(rule) =>
								rule.name === newNode.name &&
								rule.type === 'mark' &&
								oldRules.indexOf(rule) < 0,
						);
						//?????????mark????????????????????????????????????????????????
						while (type === 'mark') {
							newNode.append(node.children());
							node.append(newNode);
							newNode = filter(newNode);
							//?????????????????????????????????????????????????????????????????????????????????
							type = schema.getType(
								newNode,
								(rule) =>
									rule.name === newNode.name &&
									rule.type === 'mark' &&
									oldRules.indexOf(rule) < 0,
							);
							if (!type) break;
							rule = schema.getRule(newNode);
							if (!rule) break;
							oldRules.push(rule);
						}
					}
				}
			}
		});
	}
	/**
	 * data type:
	 *
	 * Value: <p>foo</p><p><br /><cursor /></p>
	 * LowerValue: <p>foo</p><p><br /><span data-element="cursor"></span></p>
	 * DOM: HTML DOM tree
	 * Markdown: ### heading
	 * Text: plain text
	 *
	 */
	walkTree(
		node: NodeInterface,
		schema: SchemaInterface | null = null,
		conversion: ConversionInterface | null,
		callbacks: Callbacks,
		includeCard?: boolean,
	) {
		const nodeApi = this.editor.node;

		let child = node.first();
		while (child) {
			if (child.isElement()) {
				let name = child.name;
				let attrs = child.attributes();
				let styles = child.css();
				//??????????????????style??????
				delete attrs.style;

				// Card Combine ????????????
				if (['left', 'right'].indexOf(attrs[CARD_ELEMENT_KEY]) >= 0) {
					child = child.next();
					continue;
				}
				let passed = true;
				let type: 'inline' | 'block' | 'mark' | undefined = undefined;
				if (schema && attrs[DATA_ELEMENT] !== EDITABLE) {
					//????????????????????????
					type = schema.getType(child);
					if (type === undefined) {
						passed = false;
					} else {
						//???????????????????????????????????????
						schema.filter(child, attrs, styles);
					}
				}
				// ??????????????????
				if (
					attrs[CARD_ELEMENT_KEY] !== 'center' &&
					callbacks.onOpen &&
					passed
				) {
					const result = callbacks.onOpen(child, name, attrs, styles);
					//????????????????????????
					if (result === false) {
						child = child.next();
						continue;
					}
				}
				// Card??????????????????
				if (name !== 'card' || includeCard) {
					this.walkTree(
						child,
						schema,
						conversion,
						callbacks,
						includeCard,
					);
				}
				// ??????????????????
				if (
					attrs[CARD_ELEMENT_KEY] !== 'center' &&
					callbacks.onClose &&
					passed
				) {
					callbacks.onClose(child, name, attrs, styles);
				}
			} else if (child.isText()) {
				let text = child[0].nodeValue ? escape(child[0].nodeValue) : '';
				// ???????????? DOM ???????????????????????? block ?????????????????????????????????????????????
				if (text === '' && nodeApi.isBlock(child.parent()!)) {
					if (!child.prev()) {
						text = text.replace(/^[ \n]+/, '');
					}

					if (!child.next()) {
						text = text.replace(/[ \n]+$/, '');
					}
				}
				// ???????????? block ?????????????????????
				// <p>foo</p>\n<p>bar</p>
				const childPrev = child.prev();
				const childNext = child.next();
				if (
					childPrev &&
					nodeApi.isBlock(childPrev) &&
					childNext &&
					nodeApi.isBlock(childNext) &&
					text.trim() === ''
				) {
					text = text.trim();
				}
				// ?????? zero width space
				text = text.replace(/\u200B/g, '');
				if (callbacks.onText) {
					callbacks.onText(child, text);
				}
			}
			child = child.next();
		}
	}
	/**
	 * ?????? DOM ??????????????????????????? XML ??????
	 * @param schema ??????????????????
	 * @param conversion ??????????????????
	 * @param replaceSpaces ??????????????????
	 * @param customTags ???????????????????????????????????????????????????
	 */
	toValue(
		schema: SchemaInterface | null = null,
		conversion: ConversionInterface | null = null,
		replaceSpaces: boolean = false,
		customTags: boolean = false,
	) {
		const result: Array<string> = [];
		const nodeApi = this.editor.node;
		const root = this.root.clone(true);
		if (schema) this.normalize(root, schema, conversion);
		this.editor.trigger('paser:value-before', root);
		this.walkTree(root, schema, conversion, {
			onOpen: (child, name, attrs, styles) => {
				if (
					this.editor.trigger(
						'paser:value',
						child,
						attrs,
						styles,
						result,
					) === false
				)
					return false;

				result.push('<');
				result.push(name);

				if (Object.keys(attrs).length > 0) {
					result.push(' ' + attrsToString(attrs));
				}

				if (Object.keys(styles).length > 0) {
					const stylesString = stylesToString(styles);
					if (stylesString !== '') {
						result.push(' style="');
						result.push(stylesString);
						result.push('"');
					}
				}

				if (nodeApi.isVoid(name, schema ? schema : undefined)) {
					result.push(' />');
				} else {
					result.push('>');
				}
				return;
			},
			onText: (_, text) => {
				if (replaceSpaces && text.length > 1) {
					text = text.replace(/[\u00a0 ]+/g, (item) => {
						const strArray = [];
						item = item.replace(/\u00a0/g, ' ');
						for (let n = 0; n < item.length; n++)
							strArray[n] = n % 2 == 0 ? item[n] : '??';
						return strArray.join('');
					});
				}
				result.push(text);
			},
			onClose: (_, name) => {
				if (nodeApi.isVoid(name, schema ? schema : undefined)) return;
				result.push('</'.concat(name, '>'));
			},
		});
		this.editor.trigger('paser:value-after', result);
		//????????????????????????
		result.some((value, index) => {
			if (/^\n+/g.test(value)) {
				result[index] = value.replace(/^\n+/g, '');
				return;
			}
			return true;
		});
		for (let i = result.length - 1; i >= 0; i--) {
			const value = result[i];
			if (/^\n+/g.test(value)) {
				result[i] = value.replace(/^\n+/g, '');
				continue;
			}
			break;
		}
		const value = result.join('');
		return customTags ? transformCustomTags(value) : value;
	}

	/**
	 * ?????????HTML??????
	 * @param inner ???????????????
	 * @param outter ???????????????
	 */
	toHTML(inner?: Node, outter?: Node) {
		const element = $('<div />');
		if (inner && outter) {
			$(inner).append(this.root).css(style);
			element.append(outter);
		} else {
			element.append(this.root);
		}
		this.editor.trigger('paser:html-before', this.root);
		element.traverse((domNode) => {
			const node = domNode.get<HTMLElement>();
			if (
				node &&
				node.nodeType === getWindow().Node.ELEMENT_NODE &&
				'none' === node.style['user-select'] &&
				node.parentNode
			) {
				node.parentNode.removeChild(node);
			}
		});
		this.editor.trigger('paser:html', element);
		element.find('p').css(style);
		this.editor.trigger('paser:html-after', element);
		return {
			html: element.html(),
			text: new Parser(element, this.editor).toText(
				this.editor.schema,
				true,
			),
		};
	}

	/**
	 * ??????DOM???
	 */
	toDOM(
		schema: SchemaInterface | null = null,
		conversion: ConversionInterface | null,
	) {
		const value = this.toValue(schema, conversion, false, true);
		const doc = new DOMParser().parseFromString(value, 'text/html');
		const fragment = doc.createDocumentFragment();
		const nodes = doc.body.childNodes;

		while (nodes.length > 0) {
			fragment.appendChild(nodes[0]);
		}
		return fragment;
	}

	/**
	 * ???????????????
	 * @param includeCard ?????????????????????
	 */
	toText(schema: SchemaInterface | null = null, includeCard?: boolean) {
		const root = this.root.clone(true);
		const result: Array<string> = [];
		this.walkTree(
			root,
			null,
			null,
			{
				onOpen: (node, name) => {
					if (name === 'br') {
						result.push('\n');
					}
					const nodeElement = node[0];
					if (node.name === 'li') {
						if (node.hasClass('data-list-item')) {
							return;
						}
						const parent = node.parent();
						const styleType = parent?.css('listStyleType');
						if (parent?.name === 'ol') {
							const start = parent[0]['start'];
							const index = start ? start : 1;
							const childs = parent[0].childNodes;
							let liCount = -1;
							for (
								let i = 0;
								i < childs.length &&
								childs[i].nodeName === 'LI' &&
								liCount++ &&
								childs[i] !== nodeElement;
								i++
							) {
								result.push(
									''.concat(
										getListStyle(
											styleType,
											index + liCount,
										).toString(),
										'. ',
									),
								);
							}
						} else if (parent?.name === 'ul') {
							result.push(getListStyle(styleType) + ' ');
						}
					}
				},
				onText: (_, text) => {
					text = unescape(text);
					text = text.replace(/\u00a0/g, ' ');
					result.push(text);
				},
				onClose: (node, name) => {
					if (
						name === 'p' ||
						this.editor.node.isBlock(
							node,
							schema || this.editor.schema,
						)
					) {
						result.push('\n');
					}
				},
			},
			includeCard,
		);
		return result
			.join('')
			.replace(/\n{2,}/g, '\n')
			.trim();
	}
}
export default Parser;
export { TextParser };
