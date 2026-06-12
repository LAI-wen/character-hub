const COMPRESS_THRESHOLD = 300 * 1024 // 300 KB
const MAX_DIM = 2400
const QUALITY = 0.88

export async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file

  return new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(blobUrl)

      let { naturalWidth: w, naturalHeight: h } = img
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, ".webp")
          resolve(new File([blob], name, { type: "image/webp" }))
        },
        "image/webp",
        QUALITY,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })
}
