// Image upload helpers — ported from pickImage / pickImages in the original DC.
// Opens a file picker, downscales to <=1280px, returns a JPEG data URL.

function processFile(file: File, max = 1280): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        let w = img.width
        let h = img.height
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h)
          w = Math.round(w * r)
          h = Math.round(h * r)
        }
        const cv = document.createElement('canvas')
        cv.width = w
        cv.height = h
        cv.getContext('2d')!.drawImage(img, 0, 0, w, h)
        let url: string
        try {
          url = cv.toDataURL('image/jpeg', 0.85)
        } catch {
          url = String(fr.result)
        }
        resolve(url)
      }
      img.src = String(fr.result)
    }
    fr.readAsDataURL(file)
  })
}

export function pickImage(cb: (url: string) => void) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'image/*'
  inp.onchange = async () => {
    const file = inp.files && inp.files[0]
    if (!file) return
    cb(await processFile(file))
  }
  inp.click()
}

export function pickImages(cb: (url: string) => void) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'image/*'
  inp.multiple = true
  inp.onchange = async () => {
    const files = inp.files ? Array.from(inp.files) : []
    for (const f of files) cb(await processFile(f))
  }
  inp.click()
}

// Load an image element (for the cropper / eyedropper, which need raw pixels).
export function loadImage(url: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function pickRawImage(cb: (url: string, img: HTMLImageElement) => void) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'image/*'
  inp.onchange = () => {
    const file = inp.files && inp.files[0]
    if (!file) return
    const fr = new FileReader()
    fr.onload = async () => {
      const url = String(fr.result)
      const img = await loadImage(url)
      cb(url, img)
    }
    fr.readAsDataURL(file)
  }
  inp.click()
}

export function downloadJSON(filename: string, data: unknown) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    /* noop */
  }
}

export function pickJSON(cb: (obj: unknown, filename: string) => void) {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = 'application/json,.json'
  inp.onchange = () => {
    const f = inp.files && inp.files[0]
    if (!f) return
    const fr = new FileReader()
    fr.onload = () => {
      try {
        cb(JSON.parse(String(fr.result)), f.name)
      } catch {
        alert('無法讀取此檔案，請確認是 OCTOOL 匯出的 JSON。')
      }
    }
    fr.readAsText(f)
  }
  inp.click()
}
