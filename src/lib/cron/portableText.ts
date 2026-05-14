import type { StructuredSection } from "./gemini";

let counter = 0;
function key(): string {
  counter = (counter + 1) % 1_000_000;
  return `k${Date.now().toString(36)}${counter.toString(36)}`;
}

type Span = {
  _key: string;
  _type: "span";
  text: string;
  marks: string[];
};

type Block = {
  _key: string;
  _type: "block";
  style: string;
  markDefs: never[];
  children: Span[];
};

function makeBlock(style: "h2" | "normal", text: string): Block {
  return {
    _key: key(),
    _type: "block",
    style,
    markDefs: [],
    children: [
      { _key: key(), _type: "span", text, marks: [] },
    ],
  };
}

export function sectionsToBlocks(sections: StructuredSection[]): Block[] {
  const blocks: Block[] = [];
  for (const section of sections) {
    if (section.heading?.trim()) {
      blocks.push(makeBlock("h2", section.heading.trim()));
    }
    for (const paragraph of section.paragraphs || []) {
      const text = paragraph?.trim();
      if (text) blocks.push(makeBlock("normal", text));
    }
  }
  return blocks;
}
