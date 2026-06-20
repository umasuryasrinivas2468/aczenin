import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "aczen-blog",
  title: "Aczen Blog",

  projectId: "aghe2n16",
  dataset: "aczen",

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
});
