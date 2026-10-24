import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import {
  formatOfferDateAr,
  type ProviderOffer,
} from '../../domain/model/ProviderOffer';

type Props = {
  providerId: string;
  offers: ProviderOffer[];
  onChanged: () => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ProviderOffersPanel({ providerId, offers, onChanged }: Props) {
  const { container } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [percent, setPercent] = useState('10');
  const [startsOn, setStartsOn] = useState(todayIso());
  const [endsOn, setEndsOn] = useState(addDaysIso(todayIso(), 30));
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setPercent('10');
    setStartsOn(todayIso());
    setEndsOn(addDaysIso(todayIso(), 30));
    setFormOpen(false);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setPercent('10');
    setStartsOn(todayIso());
    setEndsOn(addDaysIso(todayIso(), 30));
    setFormOpen(true);
  };

  const openEdit = (offer: ProviderOffer) => {
    setEditingId(offer.id);
    setPercent(String(offer.discountPercent));
    setStartsOn(offer.startsOn.slice(0, 10));
    setEndsOn(offer.endsOn.slice(0, 10));
    setFormOpen(true);
  };

  const save = async () => {
    const pct = Number(percent.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      Alert.alert('تنبيه', 'أدخل نسبة تخفيض بين 0.01 و 100');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
      Alert.alert('تنبيه', 'صيغة التاريخ يجب أن تكون YYYY-MM-DD');
      return;
    }
    if (endsOn < startsOn) {
      Alert.alert('تنبيه', 'تاريخ النهاية يجب أن يكون بعد البداية');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await container.providerApi.updateOffer(providerId, editingId, {
          discountPercent: pct,
          startsOn,
          endsOn,
        });
      } else {
        await container.providerApi.createOffer(providerId, {
          discountPercent: pct,
          startsOn,
          endsOn,
        });
      }
      resetForm();
      onChanged();
    } catch (e) {
      Alert.alert(
        'تعذر الحفظ',
        e instanceof Error ? e.message : 'حدث خطأ غير متوقع',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (offer: ProviderOffer) => {
    Alert.alert('حذف العرض', 'هل تريد حذف هذا التخفيض؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await container.providerApi.deleteOffer(providerId, offer.id);
              if (editingId === offer.id) resetForm();
              onChanged();
            } catch (e) {
              Alert.alert(
                'تعذر الحذف',
                e instanceof Error ? e.message : 'حدث خطأ',
              );
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>
        أنشئ تخفيضاً بنسبة مئوية لفترة محددة — يُطبَّق تلقائياً على كل حجز يقع
        تاريخه ضمن الفترة.
      </Text>

      {!formOpen ? (
        <Pressable style={styles.addRow} onPress={openCreate}>
          <Ionicons name="add-circle" size={22} color={theme.colors.accentDark} />
          <Text style={styles.addRowText}>إضافة عرض تخفيض</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId ? 'تعديل العرض' : 'عرض جديد'}
          </Text>
          <Text style={styles.label}>نسبة التخفيض %</Text>
          <TextInput
            style={styles.input}
            value={percent}
            onChangeText={setPercent}
            keyboardType="decimal-pad"
            placeholder="30"
            placeholderTextColor={theme.colors.textSecondary}
            textAlign="right"
          />
          <Text style={styles.label}>من تاريخ (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={startsOn}
            onChangeText={setStartsOn}
            placeholder="2026-08-17"
            placeholderTextColor={theme.colors.textSecondary}
            textAlign="right"
            autoCapitalize="none"
          />
          <Text style={styles.label}>إلى تاريخ (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={endsOn}
            onChangeText={setEndsOn}
            placeholder="2026-10-31"
            placeholderTextColor={theme.colors.textSecondary}
            textAlign="right"
            autoCapitalize="none"
          />
          <View style={styles.formActions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>حفظ</Text>
              )}
            </Pressable>
            <Pressable style={styles.btn} onPress={resetForm} disabled={saving}>
              <Text style={styles.btnText}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      )}

      {offers.length === 0 ? (
        <Text style={styles.empty}>لا توجد عروض بعد — أضف تخفيضاً ليظهر للعملاء.</Text>
      ) : (
        offers.map((offer) => {
          const active =
            offer.startsOn.slice(0, 10) <= todayIso() &&
            offer.endsOn.slice(0, 10) >= todayIso();
          return (
            <View key={offer.id} style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>
                    {Number(offer.discountPercent)}% تخفيض
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      active ? styles.badgeOn : styles.badgeOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        active ? styles.badgeOnText : styles.badgeOffText,
                      ]}
                    >
                      {active ? 'ساري' : 'غير ساري'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  من {formatOfferDateAr(offer.startsOn)} إلى{' '}
                  {formatOfferDateAr(offer.endsOn)}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.iconAction} onPress={() => openEdit(offer)}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </Pressable>
                <Pressable style={styles.iconAction} onPress={() => remove(offer)}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingHorizontal: 14, paddingBottom: 24 },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  addRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },
  empty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  cardBody: { flex: 1, gap: 4 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.discount,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOn: { backgroundColor: '#E8F8EF' },
  badgeOff: { backgroundColor: '#F0F4F8' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeOnText: { color: theme.colors.success },
  badgeOffText: { color: theme.colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconAction: { padding: 8 },
});
