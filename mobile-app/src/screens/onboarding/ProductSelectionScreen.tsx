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
  Surface,
  RadioButton,
  List,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore, SelectedProduct } from '../../store/onboardingStore';

export function ProductSelectionScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    isLoading,
    error,
    availableProducts,
    selectedProduct,
    employmentInfo,
    fetchProducts,
    selectProduct,
    setError,
  } = useOnboardingStore();

  const [selected, setSelected] = useState<SelectedProduct | null>(selectedProduct);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsFetching(true);
    await fetchProducts();
    setIsFetching(false);
  };

  const handleSelectProduct = (product: SelectedProduct) => {
    setSelected(product);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selected) {
      Alert.alert('Select a Product', 'Please select an account type to continue');
      return;
    }

    const result = await selectProduct(selected);
    if (result.success) {
      navigation.navigate('Terms' as never);
    } else {
      Alert.alert('Error', result.error || 'Failed to select product');
    }
  };

  const getProductIcon = (productType: string): string => {
    switch (productType.toLowerCase()) {
      case 'savings':
        return 'piggy-bank';
      case 'current':
        return 'briefcase';
      case 'student':
        return 'school';
      case 'fixed':
        return 'lock';
      default:
        return 'bank';
    }
  };

  const getProductFeatures = (productType: string): string[] => {
    switch (productType.toLowerCase()) {
      case 'savings':
        return ['Competitive interest rates', 'Free mobile banking', 'No monthly fees'];
      case 'current':
        return ['Unlimited transactions', 'Checkbook available', 'Overdraft facility'];
      case 'student':
        return ['No minimum balance', 'Free ATM card', 'Student discounts'];
      case 'fixed':
        return ['Higher interest rates', 'Flexible tenures', 'Loan collateral'];
      default:
        return ['Mobile banking', 'ATM access', 'Online transfers'];
    }
  };

  const isRecommended = (product: SelectedProduct): boolean => {
    // Recommend products based on employment status
    if (employmentInfo?.status === 'STUDENT' && product.productType.toLowerCase() === 'student') {
      return true;
    }
    if (employmentInfo?.status === 'EMPLOYED' && product.productType.toLowerCase() === 'savings') {
      return true;
    }
    if (employmentInfo?.status === 'SELF_EMPLOYED' && product.productType.toLowerCase() === 'current') {
      return true;
    }
    return false;
  };

  const renderProductCard = (product: SelectedProduct) => {
    const isSelected = selected?.productId === product.productId;
    const recommended = isRecommended(product);
    const features = getProductFeatures(product.productType);
    const icon = getProductIcon(product.productType);

    return (
      <Surface
        key={product.productId}
        style={[
          styles.productCard,
          isSelected && {
            borderColor: theme.colors.primary,
            borderWidth: 2,
          },
        ]}
        elevation={isSelected ? 2 : 1}
      >
        <View style={styles.productHeader}>
          <View style={styles.productTitleRow}>
            <List.Icon icon={icon} color={theme.colors.primary} />
            <View style={styles.productTitleContent}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {product.productName}
              </Text>
              {recommended && (
                <Chip 
                  mode="flat" 
                  compact 
                  style={{ backgroundColor: theme.colors.primaryContainer, marginTop: 4 }}
                  textStyle={{ fontSize: 10 }}
                >
                  Recommended for you
                </Chip>
              )}
            </View>
          </View>
          <RadioButton
            value={product.productId.toString()}
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => handleSelectProduct(product)}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <List.Icon icon="check" color={theme.colors.primary} style={styles.featureIcon} />
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <Button
          mode={isSelected ? 'contained' : 'outlined'}
          onPress={() => handleSelectProduct(product)}
          style={styles.selectButton}
          compact
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>
      </Surface>
    );
  };

  if (isFetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <OnboardingProgress currentStep={7} totalSteps={9} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={{ marginTop: spacing.md }}>
            Loading available products...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={7} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Choose Your Account
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Select the account type that best suits your needs
        </Text>

        {availableProducts.length > 0 ? (
          <View style={styles.productsContainer}>
            {availableProducts.map(renderProductCard)}
          </View>
        ) : (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <List.Icon icon="alert-circle-outline" color={theme.colors.outline} />
            <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center' }}>
              No products available at this time. Please try again later.
            </Text>
            <Button mode="outlined" onPress={loadProducts} style={{ marginTop: spacing.md }}>
              Retry
            </Button>
          </Surface>
        )}

        {/* Help Section */}
        <Surface style={[styles.helpCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
          <List.Icon icon="help-circle" color={theme.colors.onSecondaryContainer} />
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
              Need help choosing?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>
              Our customer service team can help you select the right account. Call us at 0800 123 456.
            </Text>
          </View>
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
          onPress={handleContinue}
          loading={isLoading}
          disabled={!selected || isLoading}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.lg,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  productsContainer: {
    gap: spacing.md,
  },
  productCard: {
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  productTitleContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  featuresContainer: {
    marginTop: spacing.sm,
    marginLeft: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  featureIcon: {
    width: 24,
    height: 24,
    margin: 0,
  },
  selectButton: {
    marginTop: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
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

export default ProductSelectionScreen;
