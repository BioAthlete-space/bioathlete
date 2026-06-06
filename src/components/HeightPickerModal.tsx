import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';
import { WheelColumn } from './WheelColumn';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface HeightPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (heightString: string) => void;
  initialHeight?: string; // Format "195 cm"
}

export function HeightPickerModal({ visible, onClose, onConfirm, initialHeight }: HeightPickerModalProps) {
  const theme = useTheme();

  let defaultHeight = 175;
  if (initialHeight && initialHeight.includes(' cm')) {
    defaultHeight = parseInt(initialHeight.replace(' cm', ''), 10) || 175;
  }

  const [height, setHeight] = useState(defaultHeight);

  useEffect(() => {
    if (visible) {
      setHeight(defaultHeight);
    }
  }, [visible]);

  const heightsData = Array.from({ length: 151 }, (_, i) => ({
    label: `${i + 100} cm`,
    value: i + 100,
  })); // 100 cm to 250 cm

  const handleConfirm = () => {
    onConfirm(`${height} cm`);
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
                
                <WheelColumn data={heightsData} value={height} onChange={(v) => setHeight(v as number)} theme={theme} />
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
    justifyContent: 'center',
    alignItems: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    paddingHorizontal: 40,
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    zIndex: -1,
  },
});
