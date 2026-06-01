import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';

export interface MultiSelectionOption {
  label: string;
  value: string;
  category?: string;
}

interface MultiSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: MultiSelectionOption[];
  selectedValues: string[];
  onConfirm: (values: string[]) => void;
  title: string;
  searchable?: boolean;
}

export function MultiSelectionModal({ visible, onClose, options, selectedValues, onConfirm, title, searchable }: MultiSelectionModalProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  // Local state to track selection before confirming
  const [localSelected, setLocalSelected] = useState<string[]>(selectedValues);

  // Sync local state when opened
  React.useEffect(() => {
    if (visible) {
      setLocalSelected(selectedValues);
    }
  }, [visible, selectedValues]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (opt.category && opt.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelect = (val: string) => {
    if (localSelected.includes(val)) {
      setLocalSelected(localSelected.filter(item => item !== val));
    } else {
      setLocalSelected([...localSelected, val]);
    }
  };

  const handleConfirm = () => {
    onConfirm(localSelected);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={[styles.modalContent, { backgroundColor: theme.background }]}
            >
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                  <Text style={[styles.cancelText, { color: theme.icon }]}>Annuler</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
                  <Text style={[styles.confirmText, { color: theme.primary }]}>Valider ({localSelected.length})</Text>
                </TouchableOpacity>
              </View>

              {searchable && (
                <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary }]}>
                  <MaterialIcons name="search" size={20} color={theme.icon} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Rechercher..."
                    placeholderTextColor={theme.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              )}

              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item.value}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: Layout.spacing.xl }}
                renderItem={({ item, index }) => {
                  const showCategoryHeader = item.category && (index === 0 || filteredOptions[index - 1].category !== item.category);
                  const isSelected = localSelected.includes(item.value);

                  return (
                    <View>
                      {showCategoryHeader && (
                        <View style={[styles.categoryHeaderContainer, { backgroundColor: theme.surfaceSecondary }]}>
                          <Text style={[styles.categoryHeaderText, { color: theme.primary }]}>
                            {item.category}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={[styles.optionRow, { borderBottomColor: theme.border }]} 
                        onPress={() => toggleSelect(item.value)}
                      >
                        <MaterialIcons 
                          name={isSelected ? "check-box" : "check-box-outline-blank"} 
                          size={24} 
                          color={isSelected ? theme.primary : theme.icon} 
                          style={styles.checkboxIcon} 
                        />
                        <Text style={[styles.optionText, { color: theme.text }, isSelected && { fontWeight: 'bold' }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </KeyboardAvoidingView>
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
    height: '80%',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
  },
  list: {
    flex: 1,
  },
  categoryHeaderContainer: {
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xs,
    borderRadius: 8,
  },
  categoryHeaderText: {
    fontSize: Typography.sizes.sm,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  optionRow: {
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxIcon: {
    marginRight: Layout.spacing.md,
  },
  optionText: {
    fontSize: Typography.sizes.md,
  },
});
