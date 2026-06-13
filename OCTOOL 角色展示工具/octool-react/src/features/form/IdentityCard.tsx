import { useOctool } from '../../store/useOctool'
import { Icon } from '../../components/Icon'
import { Card, CardHead, Labeled, inputStyle } from './FormControls'

export function IdentityCard() {
  const { character, updateCore } = useOctool()
  return (
    <Card>
      <CardHead icon={<Icon name="user" size={15} />} title="身分" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 15 }}>
        <Labeled label="角色名稱">
          <input
            value={character.name}
            onChange={(e) => updateCore('name', e.target.value)}
            placeholder="例：莉央"
            style={inputStyle}
          />
        </Labeled>
        <Labeled label="暱稱">
          <input
            value={character.nickname}
            onChange={(e) => updateCore('nickname', e.target.value)}
            placeholder="例：小央"
            style={inputStyle}
          />
        </Labeled>
      </div>
      <Labeled label="一句話介紹" style={{ marginTop: 15 }}>
        <input
          value={character.tagline}
          onChange={(e) => updateCore('tagline', e.target.value)}
          placeholder="一句能代表角色的話"
          style={inputStyle}
        />
      </Labeled>
    </Card>
  )
}
