import * as Haptics from 'expo-haptics';
import { Droplets } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { BadgeIcon, Button, Card, Chips, Dialog, Input, ProgressBar, Row, Text, type DialogHandle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useHydration, useLogWater } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatLiters } from '@/lib/workout';

export function HydrationLogger({ onClose }: { onClose: () => void }) {
  const daily = useHydration();
  const logWater = useLogWater();
  const [amount, setAmount] = useState('200');
  const [error, setError] = useState('');
  const sheet = useRef<DialogHandle>(null);
  const total = daily.data?.total_intake_ml ?? 0;
  const goal = daily.data?.daily_goal_ml ?? 0;
  const value = decimal(amount);

  const save = async () => {
    if (logWater.isPending) return;
    if (!value || !Number.isInteger(value)) {
      setError('Informe uma quantidade positiva em ml.'); return;
    }
    setError('');
    try {
      await logWater.mutateAsync(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheet.current?.dismiss();
    } catch (error) { setError(errorMessage(error)); }
  };

  return (
    <Dialog ref={sheet} sheet sheetSize="registration" scrollable={false} visible title="Registrar Hidratação" description="Quanto de água você bebeu?" onClose={onClose}
      footer={<Button size="lg" icon={Droplets} title={value ? `Registrar ${value} ml` : 'Registrar água'} onPress={save} loading={logWater.isPending} disabled={!amount.trim()} />}>
      {daily.data && <Card>
        <Row>
          <BadgeIcon icon={Droplets} size={32} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="titleSm">{formatLiters(total)} hoje</Text>
            {goal > 0 && <Text variant="caption">Meta diária: {formatLiters(goal)}</Text>}
          </View>
        </Row>
        {goal > 0 && <ProgressBar value={total / goal * 100} />}
      </Card>}
      <View style={{ gap: Spacing.two }}>
        <Text variant="label">Quantidade</Text>
        <Chips value={amount} onChange={(value) => { setAmount(value); setError(''); }} options={['200', '500', '750'].map((value) => ({ value, label: `${value} ml` }))} />
      </View>
      <Input label="Quantidade em ml" placeholder="Ex: 300" keyboardType="number-pad" value={amount} editable={!logWater.isPending} onChangeText={(value) => { setAmount(value); setError(''); }} error={error || undefined} onSubmitEditing={save} />
    </Dialog>
  );
}
