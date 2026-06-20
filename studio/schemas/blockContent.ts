import { defineType, defineArrayMember } from "sanity";

export default defineType({
  name: "blockContent",
  title: "Block Content",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
          { title: "Code", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [
              {
                name: "href",
                type: "url",
                title: "URL",
                validation: (Rule) =>
                  Rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    }),
    defineArrayMember({
      type: "object",
      name: "cta",
      title: "Button / Call-to-action",
      fields: [
        { name: "label", type: "string", title: "Button text", validation: (Rule) => Rule.required() },
        {
          name: "href",
          type: "url",
          title: "Link URL",
          validation: (Rule) => Rule.required().uri({ scheme: ["http", "https", "mailto", "tel"] }),
        },
        {
          name: "variant",
          type: "string",
          title: "Style",
          options: {
            list: [
              { title: "Primary (filled blue)", value: "primary" },
              { title: "Secondary (outline)", value: "secondary" },
            ],
            layout: "radio",
          },
          initialValue: "primary",
        },
        {
          name: "align",
          type: "string",
          title: "Alignment",
          options: {
            list: [
              { title: "Left", value: "left" },
              { title: "Center", value: "center" },
              { title: "Right", value: "right" },
            ],
            layout: "radio",
          },
          initialValue: "center",
        },
      ],
      preview: {
        select: { label: "label", href: "href" },
        prepare: ({ label, href }) => ({ title: label || "Button", subtitle: href }),
      },
    }),
  ],
});
