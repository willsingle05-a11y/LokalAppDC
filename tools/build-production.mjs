import { build } from "vite";
process.env.VITE_APP_MODE = "production";
await build({ mode: "production" });
