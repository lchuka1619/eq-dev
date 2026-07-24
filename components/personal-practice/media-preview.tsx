"use client";

import { useEffect, useRef, useState } from "react";
import { mediaAssetForIntensity } from "@/lib/personal-practice/media-assets";

type Props = {
  intensity: number;
  onContinue: () => void;
  onTextOnly: () => void;
  onBack: () => void;
};

export function MediaPreview({ intensity, onContinue, onTextOnly, onBack }: Props) {
  const asset = mediaAssetForIntensity(intensity);
  const [imageFailed, setImageFailed] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const audioSource = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    if (asset) {
      const preload = new window.Image();
      preload.src = asset.image.src;
      preload.onerror = () => setImageFailed(true);
    }
    return () => preference.removeEventListener("change", update);
  }, [asset]);

  useEffect(() => () => {
    audioSource.current?.stop();
    void audioContext.current?.close();
  }, []);

  const stopAudio = () => {
    try { audioSource.current?.stop(); } catch { /* already stopped */ }
    audioSource.current = null;
    setAudioPlaying(false);
  };

  const playAudio = async () => {
    if (!asset?.ambientAudio || muted) return;
    stopAudio();
    const context = new AudioContext();
    audioContext.current = context;
    const duration = asset.ambientAudio.durationSeconds;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.025;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.value = 0.18;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.onended = () => setAudioPlaying(false);
    audioSource.current = source;
    source.start();
    setAudioPlaying(true);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) stopAudio();
  };

  if (!asset || imageFailed) {
    return (
      <article className="pilot-card media-preview media-fallback" aria-labelledby="media-preview-title">
        <div className="pilot-step"><b>2</b><span>Media preview<small>Text-only fallback</small></span></div>
        <h3 id="media-preview-title">{imageFailed ? "Зураг ачаалагдсангүй — дасгал үргэлжилнэ." : "Өнөөдөр text-only хувилбар тохиромжтой."}</h3>
        <p>{imageFailed ? "Техникийн алдаа таны ахицад нөлөөлөхгүй." : "Эрчим өндөр үед нэмэлт дүрслэлгүй, танил бүтэцтэй хариугаа давтана."}</p>
        <div className="pilot-actions">
          <button type="button" className="text-button" onClick={onBack}>Буцах</button>
          <button type="button" className="primary-button" onClick={onTextOnly}>Text-only үргэлжлүүлэх</button>
        </div>
      </article>
    );
  }

  return (
    <article className={`pilot-card media-preview ${reducedMotion ? "reduced-motion" : ""}`} aria-labelledby="media-preview-title">
      <div className="pilot-step"><b>2</b><span>Graded media preview<small>Autoplay байхгүй · хүссэн үедээ алгасана</small></span></div>
      <h3 id="media-preview-title">Нөхцөлтэй эхлээд тайван танилцаарай</h3>
      <div className="media-frame">
        {/* Static public asset avoids runtime image optimization becoming a practice blocker. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.image.src}
          width={asset.image.width}
          height={asset.image.height}
          alt={asset.image.alt}
          onError={() => setImageFailed(true)}
        />
        <div className="media-level"><span>Level {asset.intensityLevel}</span><span>{asset.locale}</span></div>
      </div>
      <p className="media-description">Жижиг ideation бүлэгт бусдын санааг сонсоод, өөрийн нэг саналыг холбоод хэлэх мөч.</p>
      <div className="media-controls" aria-label="Орчны дууны удирдлага">
        <button type="button" onClick={() => void playAudio()} disabled={muted || audioPlaying}>
          {audioPlaying ? "Орчны дуу тоглож байна…" : "▶ Орчны дууг сонсох"}
        </button>
        <button type="button" onClick={() => void playAudio()} disabled={muted}>↻ Дахин тоглуулах</button>
        <button type="button" aria-pressed={muted} onClick={toggleMute}>{muted ? "Дуу асаах" : "Дуу хаах"}</button>
      </div>
      <p className="media-privacy">Зураг болон procedural room tone нь таны камер, микрофон, хувийн мэдээллийг ашиглахгүй.</p>
      <details className="asset-details">
        <summary>Asset мэдээлэл</summary>
        <p>{asset.source}</p><p>{asset.license}</p>
      </details>
      <div className="pilot-actions">
        <button type="button" className="text-button" onClick={onBack}>Буцах</button>
        <button type="button" className="secondary-button" onClick={onTextOnly}>Media алгасаад text-only</button>
        <button type="button" className="primary-button" onClick={onContinue}>Энэ нөхцөлөөр үргэлжлүүлэх</button>
      </div>
    </article>
  );
}
