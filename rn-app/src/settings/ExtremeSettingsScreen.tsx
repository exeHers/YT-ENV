import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {SettingsCategory, SettingItem, createDefaultExtremeSettings} from './ExtremeSettingsModels';
import {EqualizerPlugin} from '../plugins/eq/EqualizerPlugin';
import {SyncBadge} from '../ui/SyncBadge';
import {useSettingsStore} from '../state/settingsStore';

type Props = {
  equalizerPlugin: EqualizerPlugin;
  onOpenSync: () => void;
};

export function ExtremeSettingsScreen({equalizerPlugin, onOpenSync}: Props): React.JSX.Element {
  const categories = useMemo<SettingsCategory[]>(() => createDefaultExtremeSettings(), []);
  const settingsValues = useSettingsStore(state => state.values);
  const setSettingsValue = useSettingsStore(state => state.setValue);
  const clearCache = useSettingsStore(state => state.clearCache);
  const exportEnv = useSettingsStore(state => state.exportEnv);
  const importEnv = useSettingsStore(state => state.importEnv);
  const settings = useMemo(() => hydrateCategoriesWithStore(categories, settingsValues), [categories, settingsValues]);
  const [eqBands, setEqBands] = useState<number[]>(equalizerPlugin.getBandGains());
  const [presetName, setPresetName] = useState('My Preset');
  const [savedPreset, setSavedPreset] = useState<string>('Default');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    engine: true,
    canvas: false,
    mali: false,
    connect: false,
  });
  const [envBuffer, setEnvBuffer] = useState('');
  const isPureAmoledEnabled = Boolean(settingsValues['canvas.pureAmoled']);

  const updateSettingValue = (key: string, _updater: (item: SettingItem) => SettingItem, value?: string | number | boolean) => {
    if (value !== undefined) {
      setSettingsValue(key, value);
    }
  };

  const adjustBand = (index: number, delta: number) => {
    setEqBands(current => {
      const next = [...current];
      const newValue = Math.max(-12, Math.min(12, next[index] + delta));
      next[index] = Number(newValue.toFixed(1));
      equalizerPlugin.setBandGain(index, next[index]);
      return next;
    });
  };

  const savePreset = () => {
    const preset = equalizerPlugin.savePreset(presetName.trim() || 'Custom Preset');
    setSavedPreset(preset.name);
  };

  const visibleCategories = settings
    .map(category => ({
      ...category,
      items: category.items.filter(item => {
        if (!search.trim()) return true;
        const token = search.toLowerCase();
        return item.title.toLowerCase().includes(token) || item.description.toLowerCase().includes(token);
      }),
    }))
    .filter(category => category.items.length > 0);

  const visibleCategoryIds = useMemo(
    () => visibleCategories.map(c => c.id),
    [visibleCategories],
  );

  // Progressive disclosure: when searching, auto-expand categories that match.
  useEffect(() => {
    if (!search.trim()) return;
    setExpanded(current => {
      const next = {...current};
      for (const id of visibleCategoryIds) next[id] = true;
      return next;
    });
  }, [search, visibleCategoryIds]);

  return (
    <SafeAreaView style={[styles.root, !isPureAmoledEnabled && styles.rootElevated]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Extreme Settings</Text>
          <SyncBadge />
        </View>
        <Pressable style={styles.syncButton} onPress={onOpenSync}>
          <Text style={styles.syncButtonText}>Sync Account</Text>
        </Pressable>
        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          placeholder="Search settings..."
          placeholderTextColor="#7B7B7B"
        />
        {visibleCategories.map(category => (
          <View key={category.id} style={styles.section}>
            <Pressable style={styles.sectionHeader} onPress={() => setExpanded(current => ({...current, [category.id]: !current[category.id]}))}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
              <Text style={styles.chevron}>{expanded[category.id] ? 'v' : '>'}</Text>
            </Pressable>
            {expanded[category.id] &&
              settings.find(activeCategory => activeCategory.id === category.id)
                ?.items.filter(item => category.items.some(filtered => filtered.key === item.key))
                .map(item => (
              <SettingRow
                key={item.key}
                item={item}
                onSwitchChange={(enabled: boolean) =>
                  updateSettingValue(
                    item.key,
                    current =>
                    current.type === 'switch' ? {...current, enabled} : current,
                    enabled,
                  )
                }
                onActionPress={() => {
                  if (item.key === 'mali.clearCache') clearCache();
                }}
                onRangeChange={value =>
                  updateSettingValue(item.key, current => (current.type === 'range' ? {...current, value} : current), value)
                }
                onSelectChange={value =>
                  updateSettingValue(item.key, current => (current.type === 'select' ? {...current, value} : current), value)
                }
                onColorChange={value =>
                  updateSettingValue(item.key, current => (current.type === 'color' ? {...current, value} : current), value)
                }
              />
            ))}
          </View>
        ))}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15-Band Parametric EQ</Text>
          <Text style={styles.description}>Current preset: {savedPreset}</Text>
          {eqBands.map((gain, index) => (
            <View key={`band-${index}`} style={styles.eqRow}>
              <Text style={styles.eqLabel}>Band {index + 1}</Text>
              <View style={styles.eqControls}>
                <Pressable onPress={() => adjustBand(index, -0.5)} style={styles.eqButton}>
                  <Text style={styles.eqButtonText}>-</Text>
                </Pressable>
                <Text style={styles.eqValue}>{gain.toFixed(1)} dB</Text>
                <Pressable onPress={() => adjustBand(index, 0.5)} style={styles.eqButton}>
                  <Text style={styles.eqButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <TextInput
            value={presetName}
            onChangeText={setPresetName}
            placeholder="Preset name"
            placeholderTextColor="#777777"
            style={styles.presetInput}
          />
          <Pressable style={styles.savePresetButton} onPress={savePreset}>
            <Text style={styles.savePresetText}>Save Preset</Text>
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup / Restore (.env)</Text>
          <Pressable style={styles.utilityButton} onPress={() => setEnvBuffer(exportEnv())}>
            <Text style={styles.utilityButtonText}>Export Settings to .env Text</Text>
          </Pressable>
          <TextInput
            multiline
            value={envBuffer}
            onChangeText={setEnvBuffer}
            style={styles.envInput}
            placeholder="Paste .env content here to restore..."
            placeholderTextColor="#777777"
          />
          <Pressable style={styles.utilityButton} onPress={() => importEnv(envBuffer)}>
            <Text style={styles.utilityButtonText}>Import .env Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  item,
  onSwitchChange,
  onActionPress,
  onRangeChange,
  onSelectChange,
  onColorChange,
}: {
  item: SettingItem;
  onSwitchChange: (enabled: boolean) => void;
  onActionPress: () => void;
  onRangeChange: (value: number) => void;
  onSelectChange: (value: string) => void;
  onColorChange: (value: string) => void;
}): React.JSX.Element {
  if (item.type === 'switch') {
    return (
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <Switch value={item.enabled} onValueChange={onSwitchChange} />
      </View>
    );
  }

  if (item.type === 'action') {
    return (
      <Pressable style={styles.row} onPress={onActionPress}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <Text style={styles.chevron}>{'>'}</Text>
      </Pressable>
    );
  }

  if (item.type === 'range') {
    return (
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.inlineButtons}>
            <Pressable style={styles.smallBtn} onPress={() => onRangeChange(Math.max(item.min, item.value - item.step))}>
              <Text style={styles.smallBtnText}>-</Text>
            </Pressable>
            <Text style={styles.valueLabel}>{`${item.value}${item.unit ?? ''}`}</Text>
            <Pressable style={styles.smallBtn} onPress={() => onRangeChange(Math.min(item.max, item.value + item.step))}>
              <Text style={styles.smallBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (item.type === 'select') {
    const current = item.options.find(option => option.value === item.value) ?? item.options[0];
    return (
      <Pressable
        style={styles.row}
        onPress={() => {
          const index = item.options.findIndex(option => option.value === item.value);
          const next = item.options[(index + 1) % item.options.length];
          onSelectChange(next.value);
        }}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <Text style={styles.valueLabel}>{current.label}</Text>
      </Pressable>
    );
  }

  if (item.type === 'color') {
    return (
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <TextInput
          value={item.value}
          onChangeText={onColorChange}
          style={styles.colorInput}
          placeholder="#BD00FF"
          placeholderTextColor="#777777"
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Text style={styles.valueLabel}>
        {item.type === 'range'
          ? `${item.value}${item.unit ?? ''}`
          : item.type === 'select'
            ? item.options.find(opt => opt.value === item.value)?.label ?? item.value
            : ''}
      </Text>
    </View>
  );
}

function hydrateCategoriesWithStore(
  categories: SettingsCategory[],
  values: Record<string, string | number | boolean>,
): SettingsCategory[] {
  return categories.map(category => ({
    ...category,
    items: category.items.map(item => {
      const fromStore = values[item.key];
      if (item.type === 'switch') {
        return {...item, enabled: typeof fromStore === 'boolean' ? fromStore : item.enabled};
      }
      if (item.type === 'range') {
        return {...item, value: typeof fromStore === 'number' ? fromStore : item.value};
      }
      if (item.type === 'select') {
        return {...item, value: typeof fromStore === 'string' ? fromStore : item.value};
      }
      if (item.type === 'color') {
        return {...item, value: typeof fromStore === 'string' ? fromStore : item.value};
      }
      return item;
    }),
  }));
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000'},
  rootElevated: {backgroundColor: '#121212'},
  content: {padding: 16, gap: 16},
  search: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    color: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pageTitle: {color: '#F5F5F5', fontSize: 20, fontWeight: '800'},
  syncButton: {backgroundColor: 'rgba(189,0,255,0.24)', borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  syncButtonText: {color: '#E7B6FF', fontWeight: '700'},
  section: {backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: '#2A2A2A'},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sectionTitle: {color: '#BD00FF', fontSize: 18, fontWeight: '700'},
  row: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textWrap: {flex: 1},
  title: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},
  description: {color: '#AAAAAA', marginTop: 4, fontSize: 12},
  valueLabel: {color: '#BD00FF', fontSize: 13, fontWeight: '700'},
  chevron: {color: '#BD00FF', fontSize: 16, fontWeight: '700'},
  inlineButtons: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  smallBtn: {width: 24, height: 24, borderRadius: 12, backgroundColor: '#2C2C2C', alignItems: 'center', justifyContent: 'center'},
  smallBtnText: {color: '#FFFFFF', fontWeight: '700'},
  colorInput: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#131313',
  },
  eqRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqLabel: {color: '#FFFFFF', fontWeight: '600'},
  eqControls: {flexDirection: 'row', alignItems: 'center', gap: 8},
  eqButton: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#2C2C2C', alignItems: 'center', justifyContent: 'center'},
  eqButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  eqValue: {color: '#BD00FF', width: 72, textAlign: 'center', fontWeight: '700'},
  presetInput: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    backgroundColor: '#161616',
  },
  savePresetButton: {backgroundColor: '#BD00FF', borderRadius: 10, alignItems: 'center', paddingVertical: 10},
  savePresetText: {color: '#FFFFFF', fontWeight: '800'},
  utilityButton: {backgroundColor: '#262626', borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  utilityButtonText: {color: '#E7E7E7', fontWeight: '700'},
  envInput: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 10,
    color: '#FFFFFF',
    backgroundColor: '#121212',
  },
});
