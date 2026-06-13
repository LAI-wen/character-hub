import type { ReactNode } from 'react'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 22, boxShadow: '0 10px 36px rgba(0,0,0,0.06)', padding: 24 }}>
      <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 19, margin: '0 0 12px', color: 'var(--text)' }}>{title}</h2>
      {children}
    </section>
  )
}
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{n}</span>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14.5, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  )
}

export function HelpPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>使用說明</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
          OCTOOL 幫你整理一個角色的設定，再用「積木」拼成可分享的展示頁。所有內容自動存在這台裝置的瀏覽器。
        </p>
      </div>

      <Card title="三步驟上手">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Step n={1} title="編輯資料" body="在「編輯資料」填角色名稱、一句話、配色、設定相簿與各種文字區塊。右側會即時預覽。" />
          <Step n={2} title="模板與展示" body="切到「模板與展示」，從預設版型建立模板，再用右側面板加積木、點積木調整、拖曳排序。" />
          <Step n={3} title="展示或備份" body="用「全螢幕展示」呈現成品；用「備份與格式」把內容匯出成 JSON 保存或搬到別台裝置。" />
        </div>
      </Card>

      <Card title="兩種相簿差在哪">
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.9 }}>
          <li><b style={{ color: 'var(--text)' }}>設定相簿（官方設定）</b>：角色的標準設定，可在圖片上「標記」框出髮飾、刺青等細節，供作畫參考。</li>
          <li><b style={{ color: 'var(--text)' }}>圖庫・作品</b>：依設定畫出的成品，可選填「關聯」到某套設定方便對照。</li>
        </ul>
      </Card>

      <Card title="積木與分頁">
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.9 }}>
          <li><b style={{ color: 'var(--text)' }}>資訊積木</b>：名稱、一句話、頭像、主視覺、區塊、配色、相簿、標籤、小視窗。</li>
          <li><b style={{ color: 'var(--text)' }}>排版積木</b>：文字、跑馬燈、按鈕、佈局（多欄）、分隔線、間距、分頁、導覽條。</li>
          <li>加入「分頁」積木後，可在上方用「分頁檢視」逐頁編輯；開啟「全域設計 → 頁面導覽列」會在展示時自動產生切頁列。</li>
          <li>用「首屏輔助線」搭配裝置（電腦／平板／手機）檢查不捲動就看得到的範圍。</li>
        </ul>
      </Card>

      <Card title="內容 vs 格式">
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.8 }}>
          在「備份與格式」裡，<b style={{ color: 'var(--text)' }}>內容</b>是你填的所有資料（文字、圖片、配色、模板），可整包匯出入；
          <b style={{ color: 'var(--text)' }}>欄位格式</b>只記住「有哪些區塊、哪些欄位」的結構，方便套用到不同角色。兩者互不影響。
        </p>
      </Card>
    </div>
  )
}
