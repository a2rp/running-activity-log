import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    base: "/running-activity-log/",
    build: { sourcemap: false },
    plugins: [react()],
});