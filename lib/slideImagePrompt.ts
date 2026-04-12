/** Rich prompt for HF from slide copy (use after title/body are known). */
export function buildImagePromptForSlide(
  topicPrompt: string,
  title: string,
  body: string,
  slideIndex: number
): string {
  const lines = [
    topicPrompt.slice(0, 120),
    `Slide headline: ${title.slice(0, 140)}`,
    `Slide message: ${body.slice(0, 220)}`,
    `Composition ${slideIndex + 1}, editorial social graphic, high detail, no text, no watermark`,
  ];
  return lines.join("\n").replace(/\s+/g, " ").trim().slice(0, 500);
}
