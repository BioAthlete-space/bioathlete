import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';

export interface SelectionOption {
  label: string;
  value: string;
  icon?: string;
  imageUrl?: string;
  category?: string;
}

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: SelectionOption[];
  onSelect: (value: string) => void;
  title: string;
  searchable?: boolean;
}

export function SelectionModal({ visible, onClose, options, onSelect, title, searchable }: SelectionModalProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().startsWith(searchQuery.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onSelect(val);
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
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={24} color={theme.icon} />
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
                        onPress={() => handleSelect(item.value)}
                      >
                        {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.optionImage} />}
                        {!item.imageUrl && item.icon && <MaterialIcons name={item.icon as any} size={20} color={theme.icon} style={styles.optionIcon} />}
                        <Text style={[styles.optionText, { color: theme.text }]}>
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
    height: '70%',
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
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: Layout.spacing.xs,
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
  optionImage: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginRight: Layout.spacing.md,
  },
  optionIcon: {
    marginRight: Layout.spacing.md,
  },
  optionText: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
  },
});
