import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';
import { WheelColumn } from './WheelColumn';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dateString: string) => void;
  initialDate?: string; // Format: DD/MM/YYYY
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function DatePickerModal({ visible, onClose, onConfirm, initialDate }: DatePickerModalProps) {
  const theme = useTheme();

  // Parse initialDate or fallback to 01/01/2000
  let defaultDay = 1;
  let defaultMonth = 1;
  let defaultYear = 2000;

  if (initialDate && initialDate.includes('/')) {
    const parts = initialDate.split('/');
    if (parts.length === 3) {
      defaultDay = parseInt(parts[0], 10) || 1;
      defaultMonth = parseInt(parts[1], 10) || 1;
      defaultYear = parseInt(parts[2], 10) || 2000;
    }
  }

  const [day, setDay] = useState(defaultDay);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);

  // Re-sync if initialDate changes or modal opens
  useEffect(() => {
    if (visible) {
      setDay(defaultDay);
      setMonth(defaultMonth);
      setYear(defaultYear);
    }
  }, [visible]);

  const daysData = Array.from({ length: 31 }, (_, i) => ({
    label: (i + 1).toString().padStart(2, '0'),
    value: i + 1,
  }));

  const monthsData = MONTHS.map((m, i) => ({
    label: m,
    value: i + 1,
  }));

  const currentYear = new Date().getFullYear();
  const yearsData = Array.from({ length: 100 }, (_, i) => {
    const y = currentYear - i;
    return { label: y.toString(), value: y };
  }).reverse(); // Sort old to new, or new to old. Let's do 1925 to Current Year
  
  const handleConfirm = () => {
    const formattedDay = day.toString().padStart(2, '0');
    const formattedMonth = month.toString().padStart(2, '0');
    onConfirm(`${formattedDay}/${formattedMonth}/${year}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <Text style={[styles.cancelText, { color: theme.icon }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
                  <Text style={[styles.confirmText, { color: theme.primary }]}>Confirmer</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                {/* Selection Highlight Bar */}
                <View style={[styles.selectionHighlight, { backgroundColor: theme.surfaceSecondary }]} />
                
                <WheelColumn data={daysData} value={day} onChange={(v) => setDay(v as number)} theme={theme} />
                <WheelColumn data={monthsData} value={month} onChange={(v) => setMonth(v as number)} theme={theme} />
                <WheelColumn data={yearsData} value={year} onChange={(v) => setYear(v as number)} theme={theme} />
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
    paddingTop: Layout.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    paddingHorizontal: Layout.spacing.xs,
  },
  headerBtn: {
    paddingVertical: Layout.spacing.sm,
  },
  cancelText: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
  confirmText: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    zIndex: -1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: Typography.sizes.lg,
  },
});
