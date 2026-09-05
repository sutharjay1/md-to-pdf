import { classifyVideo, videoHtml } from "../src/video";

describe("classifyVideo", () => {
  it.each([
    ["https://x.com/a/clip.mp4", { kind: "file" }],
    ["https://x.com/a/clip.webm?x=1", { kind: "file" }],
    ["https://x.com/a/clip.MOV", { kind: "file" }],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", { kind: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://youtu.be/dQw4w9WgXcQ", { kind: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", { kind: "youtube", id: "dQw4w9WgXcQ" }],
    ["https://vimeo.com/123456789", { kind: "vimeo", id: "123456789" }],
  ])("%s", (url, expected) => {
    expect(classifyVideo(url)).toEqual(expected);
  });

  it.each(["https://x.com/photo.png", "https://youtube.com/", "not a url", "https://vimeo.com/about"])(
    "rejects %s",
    (url) => expect(classifyVideo(url)).toBeNull(),
  );
});

describe("videoHtml", () => {
  it("renders a file video with placeholder data", () => {
    const html = videoHtml("https://x.com/clip.mp4", "Demo")!;
    expect(html).toContain('<figure class="video" data-video="file">');
    expect(html).toContain('<video controls preload="metadata" src="https://x.com/clip.mp4"></video>');
    expect(html).toContain('<a class="video-placeholder" href="https://x.com/clip.mp4">');
    expect(html).toContain("<figcaption>Demo</figcaption>");
  });
  it("renders youtube with a nocookie embed and a thumbnail", () => {
    const html = videoHtml("https://youtu.be/dQw4w9WgXcQ", "")!;
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('src="https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"');
    expect(html).not.toContain("<figcaption>");
  });
  it("escapes alt and url", () => {
    const html = videoHtml("https://x.com/a.mp4?a=1&b=2", `<b>"x"</b>`)!;
    expect(html).toContain("&amp;b=2");
    expect(html).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  });
  it("returns null for non-video", () => {
    expect(videoHtml("https://x.com/a.png", "")).toBeNull();
  });
});
