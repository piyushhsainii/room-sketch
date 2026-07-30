export async function captureSceneSnapshot(
  canvas: HTMLCanvasElement,
): Promise<Blob | null> {
  // Force a render tick first if your R3F setup uses on-demand rendering (frameloop="demand");
  // if it's frameloop="always" (default), the buffer should already be current.
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
  });
}
