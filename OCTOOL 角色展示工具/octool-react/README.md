# OCTOOL — 角色整理與展示工具（React + Vite + TypeScript）

這是把原本的單檔角色展示工具（`OCTOOL.dc.html`）改寫成的**完整可執行 React 專案**。
下載後即可在本機跑起來，並用一般的前端開發流程繼續擴充。

## 快速開始

需要 Node.js 18 以上。

```bash
cd octool-react
npm install
npm run dev
```

終端機會顯示一個網址（預設 `http://localhost:5173`），用瀏覽器打開即可。
所有內容會自動存在瀏覽器的 `localStorage`（key：`octool:react:v1`）。

其他指令：

```bash
npm run build     # 產出 production 版到 dist/
npm run preview   # 預覽 build 後的結果
```

## 功能對照

已**完整移植**原工具：

- **編輯資料**：身分、主要圖片（含**上傳／頭像裁切**）、色票（配色組快速套用＋**圖片吸色**）、設定相簿、圖庫、文／圖設定區塊與多種欄位型別（短文字 / 長文字 / 標籤 / 必畫重點 / 不可畫錯 / 屬性表 / 物件）。
- **圖片標記**：在設定相簿的圖片上點 Pin 或拉矩形框出細節，填標題與說明；展示時以編號清單或浮動說明呈現。
- **模板與展示**：多模板切換、新增（名片 / 設定集 / 圖集 / 介紹 OC / 企劃 / paro·AU / 全部積木 預設版型）、改名、複製、刪除。
- **積木編輯**：點選調整、**拖曳排序**、**拖進欄位**、**欄寬拖拉**、上下移／複製／刪除；尺寸、對齊、間距、透明度、寬度（滿／½／⅓）、陰影效果、卡片底色／圓角／外框等進階樣式；標籤、佈局欄數與對齊、相簿比例、跑馬燈速度、分隔線樣式等型別專屬設定。
- **全域設計**：背景色、**背景圖片（上傳＋亮度／模糊／填滿）**、主色＋色庫、字體（含自訂 Google Fonts）、內容寬度、頁面導覽列。
- **裝置預覽**：電腦 / 平板 / 手機寬度，搭配**首屏輔助線**。
- **分頁**：分頁積木 + 分頁檢視切換 + 展示時自動導覽列。
- **即時預覽、全螢幕展示、燈箱、小視窗（popup）、輪播相簿**。
- **備份與格式**：角色內容 JSON 匯出入；欄位格式儲存／套用／匯出入（內建三套範例格式）。
- **主題**：淺灰 / 深灰 / 純白三套介面主題。
- **自動儲存**：透過 `localStorage` 持久化（`octool:react:v1`；欄位格式存 `octool:react:forms`）。

- **手機版編輯**：小螢幕自動切換成浮動「＋ 積木」鈕、底部操作列與滑出式面板（bottom-sheet）。
- **首屏輔助線**：依實際內容量測畫出每屏底線，超過一屏時可一鍵「自動分頁這頁」。
- **全螢幕**：多頁時可用 ↑／↓／Space 翻頁、Esc 關閉，附頁碼與圓點導覽。

> 已對齊原 `OCTOOL.dc.html` 的完整功能與 UI/UX。

## 專案結構

```
octool-react/
├─ index.html                 # 入口（載入 Google Fonts）
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ src/
   ├─ main.tsx                # React 進入點
   ├─ App.tsx                 # 外殼：主題變數、頁面切換、圖片燈箱
   ├─ index.css               # 少量 reset 與 @keyframes（其餘皆 inline style）
   ├─ types.ts                # 完整資料模型（Character / Template / Block …）
   ├─ data/
   │  ├─ demo.ts              # 範例角色「莉央」
   │  ├─ themes.ts            # 介面主題 + 字體對應
   │  ├─ presets.ts           # 配色組、色庫、標籤色
   │  ├─ blocks.ts            # 積木預設、模板預設、樹狀操作、欄位格式
   │  └─ upload.ts            # 圖片上傳／壓縮、JSON 匯出入
   ├─ store/
   │  └─ useOctool.tsx        # 中央狀態 + localStorage 持久化 + 所有 CRUD action
   ├─ components/
   │  ├─ PageHeader.tsx       # 頂部列（主題、導覽）
   │  ├─ Icon.tsx             # 內建 SVG 圖示集
   │  └─ TemplateCanvas.tsx   # 把角色套進模板的渲染器（核心，含拖曳／燈箱／輪播／popup）
   └─ features/
      ├─ form/                # 「編輯資料」頁
      │  ├─ FormPage.tsx
      │  ├─ FormControls.tsx
      │  ├─ IdentityCard.tsx
      │  ├─ ImagesPaletteCards.tsx
      │  ├─ SectionsEditor.tsx
      │  └─ AlbumsEditor.tsx
      ├─ design/              # 「模板與展示」頁
      │  ├─ DesignPage.tsx
      │  ├─ BlockInspector.tsx
      │  └─ GlobalDesignPanel.tsx
      ├─ modals/              # 圖片標記 / 頭像裁切 / 吸色 / 備份與格式
      │  ├─ AnnotationModal.tsx
      │  ├─ AvatarCropper.tsx
      │  ├─ EyedropperModal.tsx
      │  └─ BackupModal.tsx
      └─ help/
         └─ HelpPage.tsx      # 使用說明
```

## 設計說明

- 風格沿用原工具：圓角卡片、`Newsreader` 標題字、CJK 內文字體，以及 inline style 為主的寫法。
- 介面顏色透過 CSS 變數（`--bg`、`--text`、`--accent`…）切換主題；模板本身的顏色（`design.bg / primary / font`）則獨立於介面主題。
- 狀態集中在 `useOctool`，元件透過 `useOctool()` 取用；要加新動作時，在 store 的 `OctoolStore` 介面與實作各加一處即可。

原本的 `OCTOOL.dc.html` 與 `TemplateCanvas.dc.html` 仍保留在上層專案中，未受影響。
