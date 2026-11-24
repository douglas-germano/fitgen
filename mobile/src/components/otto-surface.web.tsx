import { A2uiSurface } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1';
import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';

import { fontFor } from '@/constants/theme';
import { useColors } from '@/providers/theme';

import './otto-surface.css';

type Item = { title: string; detail?: string; action?: { id: string; label: string } };

export function OttoCard({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  const style = {
    '--otto-ink': colors.ink, '--otto-muted': colors.inkMuted, '--otto-line': colors.line,
    '--otto-card': colors.surfaceSunken, '--otto-surface': colors.surface, '--otto-volt': colors.volt,
    '--otto-on-volt': colors.onVolt, '--otto-soft': colors.voltSoft, '--otto-focus': colors.focus,
    '--a2ui-color-on-background': colors.ink, '--a2ui-text-color-text': colors.ink,
    '--a2ui-color-primary': colors.volt, '--a2ui-color-on-primary': colors.onVolt,
    '--a2ui-button-border-radius': '12px', '--a2ui-button-margin': '0',
    '--a2ui-column-gap': '8px', fontFamily: fontFor(400),
  } as CSSProperties;
  return (
    <section aria-label={title} className="fitgen-otto-card" style={style}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function OttoSurface({ items, action, onAction }: {
  items: Item[];
  action?: { id: string; label: string };
  onAction?: (id: string) => void;
}) {
  const surface = useMemo(() => {
    const processor = new MessageProcessor([basicCatalog]);
    const surfaceId = 'otto-content';
    const components: { id: string; component: string; [key: string]: unknown }[] = [];
    const children: string[] = [];
    const addAction = (item: NonNullable<Item['action']>, index: number) => {
      const id = `action-${index}`;
      components.push(
        { id: `${id}-label`, component: 'Text', text: item.label },
        { id, component: 'Button', child: `${id}-label`, variant: 'primary', action: { event: { name: item.id } } },
      );
      children.push(id);
    };
    items.forEach(({ title, detail, action }, index) => {
      const id = `item-${index}`;
      components.push({ id, component: 'Text', text: title });
      children.push(id);
      if (detail) {
        components.push({ id: `${id}-detail`, component: 'Text', text: detail });
        children.push(`${id}-detail`);
      }
      if (action) addAction(action, index);
    });
    if (action) addAction(action, items.length);
    processor.processMessages([
      { version: '1.0', createSurface: { surfaceId, catalogId: basicCatalog.id } },
      { version: '1.0', updateComponents: { surfaceId, components: [{ id: 'root', component: 'Column', children }, ...components] } },
    ]);
    return processor.model.surfacesMap.get(surfaceId);
  }, [action, items]);

  useEffect(() => {
    const subscription = surface?.onAction.subscribe(({ name }) => onAction?.(name));
    return () => subscription?.unsubscribe();
  }, [surface, onAction]);

  return surface ? <A2uiSurface surface={surface} /> : null;
}
