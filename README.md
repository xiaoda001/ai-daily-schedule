# 任务清单

一个离线优先的 Tauri 桌面任务安排应用。任务数据保存在本机 SQLite 中，前端使用 Vanilla TypeScript + Vite，Rust commands 负责任务规则和数据库访问。

## 开发

```powershell
npm install
npm run tauri:dev
```

## 本地构建 Windows 安装包

```powershell
npm run tauri:build
```

本地安装包输出在 `src-tauri/target/release/bundle/`。正式桌面安装包由 GitHub Actions 构建。

## GitHub Actions 桌面打包

- 推送到 `master`、创建面向 `master` 的 Pull Request 或手动运行 `Build desktop apps` 时，GitHub Actions 分别打包 Windows x64、macOS Apple Silicon 和 macOS Intel 版本。
- 构建成功后，可在对应 workflow run 的 Artifacts 下载 MSI、NSIS 安装程序和 macOS DMG/App 包。
- 推送 `v*` 版本标签时，Actions 还会创建包含各平台包的草稿 GitHub Release，检查后可在 GitHub 发布。
- macOS 包当前未配置 Apple 签名与公证；下载后首次运行可能需要在 macOS 中手动允许打开。

## 首版功能

- 在“任务点”页签查看待完成与进行中任务，进行中任务优先置顶；在“已完成”页签查看已完成任务。
- 新建和编辑任务，支持可选描述及状态变更。
- 新建、改名和删除任务分组。
- 在左侧拖拽自定义分组调整顺序，顺序保存在本机。
- 删除分组前确认；确认后同时删除分组中的任务。
- 可归档分组并在侧栏归档入口查看；归档任务按进行中、待完成、已完成顺序分区显示，分组可恢复。
- 左侧底部“设置”可查看数据存储路径，并选择新目录迁移本机 SQLite 数据；迁移后立即切换到新位置，旧数据库保留作备份。
- 为避免覆盖，目标目录已存在 `tasks.sqlite3` 时不能迁移到该目录。

不需要登录或网络连接。

## 代码组织

```text
src/
  app/                 应用启动与页面状态编排
  components/          可组合的页面区块和弹窗模板
  domain/              任务、分组和状态类型
  features/            任务操作、分组操作、导航、页签和弹窗行为
  services/            按业务对象封装的 Tauri command 调用
  shared/              Tauri bridge、错误、HTML 转义和通知工具
src-tauri/src/
  commands/            按任务与分组拆分的 Tauri commands
  models.rs            Rust 数据模型和应用状态
  store.rs             SQLite 初始化、连接和通用查询辅助
  lib.rs               Tauri builder 与模块组合入口
```

前端使用原生 ES module 导入，不设全局 barrel 文件；Vite/Rollup 在生产构建时执行 tree-shaking。新增功能应放入独立 feature/service/component，避免把命令、界面模板和事件逻辑重新集中到入口文件。
