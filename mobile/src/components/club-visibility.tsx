import { View } from 'react-native';
import { ChoiceField } from '@/components/choice-field';
import { Text } from '@/components/ui';
export function ClubVisibility({ isPublic, onChange }: { isPublic: boolean; onChange: (value: boolean) => void }) {
  return <View style={{ gap: 10 }}>
    <ChoiceField label="Visibilidade do clube" value={isPublic ? 'public' : 'private'} options={[{ label: 'Privado', value: 'private' }, { label: 'Público', value: 'public' }]} onChange={v => onChange(v === 'public')} />
    <Text muted>{isPublic ? 'Aparece em Explorar. Qualquer pessoa pode entrar sem código.' : 'Não aparece em Explorar. A entrada é por código de convite.'} O feed e o ranking ficam disponíveis apenas aos membros.</Text>
  </View>;
}
