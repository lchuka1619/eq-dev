import type { SceneRenderer } from "./variation-engine";

export type MediaAsset = {
  id: string;
  sceneId: string;
  renderer: Extract<SceneRenderer, "text_voice" | "image_audio">;
  locale: "mn-MN";
  intensityLevel: 1 | 2 | 3;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  ambientAudio: {
    kind: "procedural-room-tone";
    durationSeconds: number;
  } | null;
  source: string;
  license: string;
  qaStatus: "approved";
};

export const ideationEventMedia: MediaAsset = {
  id: "ideation-event-calm-v1",
  sceneId: "organization-ideation-event",
  renderer: "image_audio",
  locale: "mn-MN",
  intensityLevel: 1,
  image: {
    src: "/media/ideation-event-calm-v1.png",
    width: 1672,
    height: 941,
    alt: "Тайван хурлын өрөөнд гурван хамтрагч ширээ тойрон санааны карт ярилцаж байна.",
  },
  ambientAudio: {
    kind: "procedural-room-tone",
    durationSeconds: 8,
  },
  source: "Generated for EQ Dev with OpenAI image generation on 2026-07-24.",
  license: "Project-use generated asset; no third-party source material or recognizable brand is asserted.",
  qaStatus: "approved",
};

export function mediaAssetForIntensity(intensity: number) {
  return intensity >= 9 ? null : ideationEventMedia;
}
