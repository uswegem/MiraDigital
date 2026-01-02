import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  TextInput,
  Surface,
  Menu,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore, AddressInfo } from '../../store/onboardingStore';

// Tanzania regions and districts
const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
  'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro',
  'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani',
  'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora',
  'Tanga', 'Unguja North', 'Unguja South', 'Zanzibar Central/South',
  'Zanzibar North', 'Zanzibar Urban/West'
];

// Sample districts (in production, load from backend based on region)
const DISTRICTS_BY_REGION: Record<string, string[]> = {
  'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
  'Arusha': ['Arusha City', 'Arusha Rural', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
  'Dodoma': ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
  'Mwanza': ['Mwanza City', 'Ilemela', 'Nyamagana', 'Kwimba', 'Magu', 'Misungwi', 'Sengerema', 'Ukerewe'],
  // Add more as needed - in production, fetch from API
};

export function AddressScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    isLoading,
    error,
    addressInfo,
    saveAddressInfo,
    setError,
  } = useOnboardingStore();

  const [formData, setFormData] = useState<AddressInfo>({
    region: addressInfo?.region || '',
    district: addressInfo?.district || '',
    ward: addressInfo?.ward || '',
    street: addressInfo?.street || '',
    houseNumber: addressInfo?.houseNumber || '',
    postalCode: addressInfo?.postalCode || '',
  });

  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [showDistrictMenu, setShowDistrictMenu] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  // Update districts when region changes
  useEffect(() => {
    if (formData.region) {
      const districts = DISTRICTS_BY_REGION[formData.region] || [];
      setAvailableDistricts(districts);
      // Clear district if it's not in the new list
      if (!districts.includes(formData.district)) {
        setFormData(prev => ({ ...prev, district: '' }));
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [formData.region]);

  const updateField = (field: keyof AddressInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.region.trim()) {
      Alert.alert('Validation Error', 'Please select your region');
      return false;
    }
    if (!formData.district.trim()) {
      Alert.alert('Validation Error', 'Please select your district');
      return false;
    }
    if (!formData.street.trim()) {
      Alert.alert('Validation Error', 'Please enter your street address');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const result = await saveAddressInfo(formData);
    if (result.success) {
      navigation.navigate('Employment' as never);
    } else {
      Alert.alert('Error', result.error || 'Failed to save address');
    }
  };

  const renderRegionSelector = () => (
    <View style={styles.menuContainer}>
      <Menu
        visible={showRegionMenu}
        onDismiss={() => setShowRegionMenu(false)}
        anchor={
          <TextInput
            label="Region *"
            value={formData.region}
            mode="outlined"
            editable={false}
            right={<TextInput.Icon icon="menu-down" onPress={() => setShowRegionMenu(true)} />}
            onPressIn={() => setShowRegionMenu(true)}
            style={styles.input}
          />
        }
        contentStyle={styles.menuContent}
      >
        <ScrollView style={styles.menuScroll}>
          {REGIONS.map((region) => (
            <Menu.Item
              key={region}
              onPress={() => {
                updateField('region', region);
                setShowRegionMenu(false);
              }}
              title={region}
            />
          ))}
        </ScrollView>
      </Menu>
    </View>
  );

  const renderDistrictSelector = () => (
    <View style={styles.menuContainer}>
      <Menu
        visible={showDistrictMenu}
        onDismiss={() => setShowDistrictMenu(false)}
        anchor={
          <TextInput
            label="District *"
            value={formData.district}
            mode="outlined"
            editable={false}
            disabled={!formData.region}
            right={<TextInput.Icon icon="menu-down" onPress={() => formData.region && setShowDistrictMenu(true)} />}
            onPressIn={() => formData.region && setShowDistrictMenu(true)}
            style={styles.input}
          />
        }
        contentStyle={styles.menuContent}
      >
        <ScrollView style={styles.menuScroll}>
          {availableDistricts.length > 0 ? (
            availableDistricts.map((district) => (
              <Menu.Item
                key={district}
                onPress={() => {
                  updateField('district', district);
                  setShowDistrictMenu(false);
                }}
                title={district}
              />
            ))
          ) : (
            <Menu.Item title="No districts available" disabled />
          )}
        </ScrollView>
      </Menu>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={5} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Your Address
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Enter your current residential address
        </Text>

        {/* Region */}
        {renderRegionSelector()}

        {/* District */}
        {renderDistrictSelector()}

        {/* Ward (Optional) */}
        <TextInput
          label="Ward"
          value={formData.ward}
          onChangeText={(text) => updateField('ward', text)}
          mode="outlined"
          placeholder="Enter your ward"
          style={styles.input}
        />

        {/* Street Address */}
        <TextInput
          label="Street Address *"
          value={formData.street}
          onChangeText={(text) => updateField('street', text)}
          mode="outlined"
          placeholder="e.g., Mtaa wa Uhuru, Block 5"
          style={styles.input}
          multiline
          numberOfLines={2}
        />

        {/* House Number (Optional) */}
        <TextInput
          label="House/Plot Number"
          value={formData.houseNumber}
          onChangeText={(text) => updateField('houseNumber', text)}
          mode="outlined"
          placeholder="e.g., Plot 123 or House 45A"
          style={styles.input}
        />

        {/* Postal Code (Optional) */}
        <TextInput
          label="Postal Code"
          value={formData.postalCode}
          onChangeText={(text) => updateField('postalCode', text)}
          mode="outlined"
          placeholder="e.g., 11101"
          keyboardType="numeric"
          maxLength={10}
          style={styles.input}
        />

        {/* Note */}
        <Surface style={[styles.noteCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <List.Icon icon="information-outline" color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
            Your address will be used for account statements and correspondence. 
            Make sure it matches your ID document if possible.
          </Text>
        </Surface>

        {error && (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.footerButton}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.footerButton}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  menuContainer: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  menuContent: {
    maxHeight: 300,
  },
  menuScroll: {
    maxHeight: 280,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

export default AddressScreen;
