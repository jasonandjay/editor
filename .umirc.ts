import { defineConfig } from 'dumi';

export default defineConfig({
	title: '八维创作平台协同编辑器',
	favicon: 'https://www.bwie.com/static/home/logo/logo.jpg',
	logo: 'https://www.bwie.com/favicon.ico',
	outputPath: 'docs-dist',
	hash: true,
	mode: 'site',
	ssr: {
		devServerRender: false,
		removeWindowInitialProps: true,
	},
	navs: {
		'en-US': [
			{
				title: 'Edit',
				path: '/',
			},
		],
		'zh-CN': [
			{
				title: '编辑',
				path: '/zh-CN',
			},
		],
	},
	manifest: {
		fileName: 'manifest.json',
	},
	metas: [
		{
			name: 'viewport',
			content:
				'viewport-fit=cover,width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no',
		},
		{
			name: 'apple-mobile-web-app-capable',
			content: 'yes',
		},
		{
			name: 'apple-mobile-web-app-status-bar-style',
			content: 'black',
		},
		{
			name: 'renderer',
			content: 'webkit',
		},
	],
	// more config: https://d.umijs.org/config
});
