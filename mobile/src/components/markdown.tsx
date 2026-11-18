import { View } from 'react-native';

import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

/** Renders `**bold**` and `*italic*` spans inside a line. */
function Inline({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text style={{ color, fontSize: 15, lineHeight: 22 }}>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <Text key={i} style={{ color, fontWeight: '700', fontSize: 15 }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('*') && p.length > 2 ? (
          <Text key={i} style={{ color, fontStyle: 'italic', fontSize: 15 }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

/**
 * Minimal Markdown for coach answers: headings, bullet/numbered lists,
 * paragraphs and bold/italic — the subset Gemini actually returns.
 */
export function Markdown({ content, color: customColor }: { content: string; color?: string }) {
  const Colors = useColors();
  const color = customColor ?? Colors.ink;
  const blocks = content.replace(/\r/g, '').split('\n');
  return (
    <View style={{ gap: Spacing.one }}>
      {blocks.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const heading = line.match(/^#{1,6}\s+(.*)/);
        if (heading) {
          return (
            <Text key={i} style={{ color, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
              {heading[1].replace(/\*\*/g, '')}
            </Text>
          );
        }
        const bullet = line.match(/^\s*[-*•]\s+(.*)/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (bullet || numbered) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 6, paddingLeft: 4 }}>
              <Text style={{ color, fontSize: 15, lineHeight: 22 }}>{numbered ? `${numbered[1]}.` : '•'}</Text>
              <View style={{ flex: 1 }}>
                <Inline text={numbered ? numbered[2] : bullet![1]} color={color} />
              </View>
            </View>
          );
        }
        return <Inline key={i} text={line} color={color} />;
      })}
    </View>
  );
}
