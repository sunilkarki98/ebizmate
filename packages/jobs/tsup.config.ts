import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: true,
    bundle: true,
    skipNodeModulesBundle: true,
    external: ["@nestjs/microservices", "@nestjs/websockets", "@nestjs/core", "@nestjs/common"]
});
