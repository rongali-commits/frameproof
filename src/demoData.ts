import type { Asset, Comment, DecisionRecord } from "@/types";

import springV1 from "@/artworks/aster-spring-v1.svg";
import springV2 from "@/artworks/aster-spring-v2.svg";
import bloomV1 from "@/artworks/bloom-type-v1.svg";
import bloomV2 from "@/artworks/bloom-type-v2.svg";
import fieldV1 from "@/artworks/field-guide-v1.svg";
import fieldV2 from "@/artworks/field-guide-v2.svg";

export const PROJECT_NAME = "Aster Studio";
export const PROJECT_SUBTITLE = "Spring identity";
export const PROJECT_DESCRIPTION =
  "A fictional demo project. Demo data is stored on this device. No real invitations or uploads are sent.";

export const ASSETS: Asset[] = [
  {
    id: "asset-spring",
    name: "Spring poster",
    subtitle: "Primary identity poster",
    versions: [
      {
        id: "ver-spring-v1",
        version: "v1",
        label: "v1",
        src: springV1,
        uploadedAt: "2026-08-20T10:00:00.000Z",
      },
      {
        id: "ver-spring-v2",
        version: "v2",
        label: "v2",
        src: springV2,
        uploadedAt: "2026-09-05T14:00:00.000Z",
      },
    ],
  },
  {
    id: "asset-bloom",
    name: "Bloom type specimen",
    subtitle: "Typographic specimen sheet",
    versions: [
      {
        id: "ver-bloom-v1",
        version: "v1",
        label: "v1",
        src: bloomV1,
        uploadedAt: "2026-08-22T09:30:00.000Z",
      },
      {
        id: "ver-bloom-v2",
        version: "v2",
        label: "v2",
        src: bloomV2,
        uploadedAt: "2026-09-08T11:15:00.000Z",
      },
    ],
  },
  {
    id: "asset-field",
    name: "Field guide",
    subtitle: "Colour and form reference",
    versions: [
      {
        id: "ver-field-v1",
        version: "v1",
        label: "v1",
        src: fieldV1,
        uploadedAt: "2026-08-25T16:00:00.000Z",
      },
      {
        id: "ver-field-v2",
        version: "v2",
        label: "v2",
        src: fieldV2,
        uploadedAt: "2026-09-10T13:45:00.000Z",
      },
    ],
  },
];

export const DEMO_COMMENTS: Comment[] = [
  {
    id: "c1",
    assetId: "asset-spring",
    versionId: "ver-spring-v1",
    pin: { id: "p1", x: 0.5, y: 0.14 },
    author: "Mara",
    body: "The serif feels right for the seasonal concept. Can we tighten the tracking on the subtitle?",
    createdAt: "2026-08-21T08:30:00.000Z",
    resolved: false,
    replies: [
      {
        id: "r1",
        author: "Devin",
        body: "Agreed. I will reduce the letter spacing by about 20 percent in the next pass.",
        createdAt: "2026-08-21T10:15:00.000Z",
      },
    ],
  },
  {
    id: "c2",
    assetId: "asset-spring",
    versionId: "ver-spring-v1",
    pin: { id: "p2", x: 0.5, y: 0.56 },
    author: "Mara",
    body: "The vermilion accent line is great but maybe slightly too heavy here.",
    createdAt: "2026-08-21T09:00:00.000Z",
    resolved: true,
    replies: [],
  },
  {
    id: "c3",
    assetId: "asset-spring",
    versionId: "ver-spring-v2",
    pin: { id: "p3", x: 0.5, y: 0.16 },
    author: "Devin",
    body: "Switched to a sans-serif system as discussed. The tracking is tighter and the weight is heavier.",
    createdAt: "2026-09-06T09:00:00.000Z",
    resolved: false,
    replies: [
      {
        id: "r2",
        author: "Mara",
        body: "This reads much cleaner. The bold weight gives it more presence.",
        createdAt: "2026-09-06T14:20:00.000Z",
      },
    ],
  },
  {
    id: "c4",
    assetId: "asset-bloom",
    versionId: "ver-bloom-v1",
    pin: { id: "p4", x: 0.2, y: 0.5 },
    author: "Mara",
    body: "The italic body text is elegant but might be hard to read at smaller sizes.",
    createdAt: "2026-08-23T11:00:00.000Z",
    resolved: false,
    replies: [],
  },
  {
    id: "c5",
    assetId: "asset-bloom",
    versionId: "ver-bloom-v2",
    pin: { id: "p5", x: 0.2, y: 0.5 },
    author: "Devin",
    body: "Moved to a sans-serif specimen. Body text is now upright for readability.",
    createdAt: "2026-09-09T10:00:00.000Z",
    resolved: false,
    replies: [],
  },
  {
    id: "c6",
    assetId: "asset-field",
    versionId: "ver-field-v1",
    pin: { id: "p6", x: 0.5, y: 0.4 },
    author: "Mara",
    body: "Love the colour swatch layout. The serif headers feel a bit informal for a field guide though.",
    createdAt: "2026-08-26T09:00:00.000Z",
    resolved: true,
    replies: [],
  },
];

export const DEMO_DECISIONS: DecisionRecord[] = [
  {
    id: "d1",
    assetId: "asset-spring",
    versionId: "ver-spring-v1",
    status: "changes_requested",
    reviewer: "Mara",
    note: "Serif direction is promising but tracking and accent weight need work.",
    createdAt: "2026-08-22T10:00:00.000Z",
  },
  {
    id: "d2",
    assetId: "asset-bloom",
    versionId: "ver-bloom-v1",
    status: "changes_requested",
    reviewer: "Mara",
    note: "Italic body text is not legible enough at small sizes.",
    createdAt: "2026-08-24T09:00:00.000Z",
  },
  {
    id: "d3",
    assetId: "asset-field",
    versionId: "ver-field-v1",
    status: "approved",
    reviewer: "Mara",
    note: "Colour system is solid. Headers could evolve but the foundation is approved.",
    createdAt: "2026-08-27T10:00:00.000Z",
  },
];
