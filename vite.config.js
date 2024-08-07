import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	loadEnv(mode, process.cwd());
	return {
		resolve: {
			dedupe: ["vue"],
		},
		base: "./",
		server: { port: 1314 },
		plugins: [
			//
			vue(),
			dts(),
		],
		build: {
			outDir: "typings",
			assetsInlineLimit: 0,
			lib: {
				// Could also be a dictionary or array of multiple entry points
				entry: resolve(__dirname, "src/index.ts"),
				name: "SharedRef",
				// the proper extensions will be added
				fileName: "shared-ref",
			},
			rollupOptions: {
				// 确保外部化处理那些你不想打包进库的依赖
				external: ["vue"],
				output: {
					// 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
					globals: {
						vue: "Vue",
					},
				},
			},
		},
	};
});
