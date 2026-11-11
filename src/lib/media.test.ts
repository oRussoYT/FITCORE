import { describe, expect, it } from "vitest";
import { youtubeEmbed, youtubeId } from "./media";

describe("vídeos", () => {
  it("reconhece links do YouTube", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=72UUJVBuT7o")).toBe("72UUJVBuT7o");
    expect(youtubeId("https://youtu.be/-R3bDwWoREU")).toBe("-R3bDwWoREU");
    expect(youtubeId("https://www.youtube.com/shorts/_vO2dAnz__c")).toBe("_vO2dAnz__c");
    expect(youtubeId("https://exemplo.com/video.mp4")).toBeNull();
  });
  it("usa o domínio sem cookies e repete o vídeo", () => {
    const u = youtubeEmbed("72UUJVBuT7o");
    expect(u).toContain("youtube-nocookie.com/embed/72UUJVBuT7o");
    expect(u).toContain("loop=1");
    expect(u).toContain("playlist=72UUJVBuT7o");
  });
});
