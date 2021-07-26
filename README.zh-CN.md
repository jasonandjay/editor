# editor

## 开发

需要在 `am-editor 根目录` `site-ssr` `ot-server` 中分别安装依赖

```base
//依赖安装好后，只需要在根目录执行以下命令
yarn ssr

-   `packages` 引擎和工具栏
-   `plugins` 所有的插件
-   `site-ssr` 所有的后端 API 和 SSR 配置。使用的 egg 。在 am-editor 根目录下使用 yarn ssr 自动启动 `site-ssr`
-   `ot-server` 协同服务端。启动：yarn start

启动后访问 localhost:7001

// 关闭端口
sudo lsof -i :7001
sudo kill -9
```
