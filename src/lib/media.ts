/** Identifica vídeos do YouTube e monta o endereço de incorporação sem cookies de rastreamento. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1]! : null;
}

export function youtubeEmbed(id: string, opts: { autoplay?: boolean } = {}) {
  const p = new URLSearchParams({
    autoplay: opts.autoplay === false ? "0" : "1",
    mute: "1",
    loop: "1",
    playlist: id,
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}
