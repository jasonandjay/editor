import React from 'react';
import classNames from 'classnames-es-ts';
import { EngineInterface, isMobile } from '@aomao/engine';
import Popover from 'antd/es/popover';
import Button, { ButtonProps } from '../button';
import Dropdown, { DropdownProps } from '../dropdown';
import ColorButton, { ColorButtonProps } from '../color';
import Collapse, { CollapseProps as CollapseButtonProps } from '../collapse';
import 'antd/es/popover/style';
import './index.css';

export type GroupButtonProps = {
	type: 'button';
} & Omit<ButtonProps, 'engine'>;

export type GroupDropdownProps = {
	type: 'dropdown';
} & Omit<DropdownProps, 'engine'>;

export type GroupColorProps = {
	type: 'color';
} & Omit<ColorButtonProps, 'engine'>;

export type CollapseProps = {
	type: 'collapse';
} & Omit<CollapseButtonProps, 'engine'>;

export type GroupProps = {
	engine: EngineInterface;
	items: Array<
		GroupButtonProps | GroupDropdownProps | GroupColorProps | CollapseProps
	>;
	icon?: React.ReactNode;
	content?: React.ReactNode | (() => React.ReactNode);
};

const ToolbarGroup: React.FC<GroupProps> = ({
	engine,
	items,
	icon,
	content,
}) => {
	const renderItems = () => {
		return items.map((item, index) => {
			switch (item.type) {
				case 'button':
					return <Button engine={engine} key={item.name} {...item} />;
				case 'dropdown':
					return (
						<Dropdown engine={engine} key={item.name} {...item} />
					);
				case 'color':
					return (
						<ColorButton
							engine={engine}
							key={item.name}
							{...item}
						/>
					);
				case 'collapse':
					return <Collapse engine={engine} key={index} {...item} />;
			}
		});
	};

	const render = () => {
		if (!!icon || !!content) {
			return (
				<Popover
					getPopupContainer={() =>
						document.querySelector('.editor-toolbar') ||
						document.body
					}
					trigger="click"
					overlayClassName="editor-toolbar-popover"
					content={
						<div
							className={classNames('editor-toolbar', {
								'editor-toolbar-mobile': isMobile,
							})}
							data-element="ui"
						>
							{renderItems()}
						</div>
					}
					arrowPointAtCenter
					placement={isMobile ? 'topRight' : 'bottom'}
				>
					<Button
						name="group-popover"
						icon={icon}
						content={content}
					/>
				</Popover>
			);
		}
		return renderItems();
	};

	return <div className="editor-toolbar-group">{render()}</div>;
};

export default ToolbarGroup;
