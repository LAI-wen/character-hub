export async function uploadToR2(bucket: R2Bucket, key: string, data: ArrayBuffer, contentType: string): Promise<void> {
  await bucket.put(key, data, { httpMetadata: { contentType } });
}

export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

export function getR2PublicUrl(key: string): string {
  return `https://media.oc-tools.pages.dev/${key}`;
}
