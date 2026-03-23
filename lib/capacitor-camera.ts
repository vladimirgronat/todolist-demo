import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

/**
 * Check if native camera is available (running inside Capacitor shell).
 */
export const isNativeCameraAvailable = (): boolean =>
  Capacitor.isNativePlatform();

/**
 * Take a photo using the device camera (native only).
 * Returns the photo as a File ready for upload, or null if cancelled.
 */
export const takePhoto = async (): Promise<File | null> => {
  const image = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    quality: 85,
    width: 1920,
    height: 1920,
    allowEditing: false,
  });

  return await uriToFile(image.webPath, image.format);
};

/**
 * Pick a photo from the device gallery (native only).
 * Returns the photo as a File ready for upload, or null if cancelled.
 */
export const pickPhoto = async (): Promise<File | null> => {
  const image = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    quality: 85,
    width: 1920,
    height: 1920,
  });

  return await uriToFile(image.webPath, image.format);
};

const uriToFile = async (
  webPath: string | undefined,
  format: string
): Promise<File | null> => {
  if (!webPath) return null;

  const response = await fetch(webPath);
  const blob = await response.blob();

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const ext = format === "png" ? "png" : "jpg";
  const filename = `photo-${Date.now()}.${ext}`;

  return new File([blob], filename, { type: mimeType });
};
