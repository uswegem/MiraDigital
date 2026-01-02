import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  useTheme,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
  route: any;
}

export function WelcomeScreen({ navigation, route }: WelcomeScreenProps) {
  const theme = useTheme();
  const tenantConfig = route.params?.tenantConfig;

  const features = [
    { icon: 'shield-check', text: 'Secure & Fast Verification' },
    { icon: 'clock-fast', text: 'Open Account in Minutes' },
    { icon: 'cellphone-check', text: 'Fully Digital Process' },
    { icon: 'bank', text: 'Access Banking Services' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {tenantConfig?.branding?.logo ? (
            <Image
              source={{ uri: tenantConfig.branding.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Icon name="bank" size={60} color="#FFF" />
            </View>
          )}
        </View>

        {/* Title */}
        <Text variant="headlineMedium" style={styles.title}>
          Open Your Account
        </Text>
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Join thousands of customers enjoying seamless digital banking
        </Text>

        {/* Features */}
        <Surface style={[styles.featuresCard, { backgroundColor: theme.colors.surface }]}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon name={feature.icon} size={24} color={theme.colors.primary} />
              </View>
              <Text variant="bodyMedium" style={styles.featureText}>
                {feature.text}
              </Text>
            </View>
          ))}
        </Surface>

        {/* What you'll need */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          What you'll need:
        </Text>
        <View style={styles.requirementsList}>
          <RequirementItem icon="card-account-details" text="National ID (NIDA)" />
          <RequirementItem icon="cellphone" text="Active phone number" />
          <RequirementItem icon="camera" text="Camera for selfie" />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('OnboardingPhone')}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
        >
          Get Started
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('OnboardingResume')}
          style={styles.secondaryButton}
        >
          Resume Application
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
        >
          Already have an account? Sign In
        </Button>
      </View>
    </SafeAreaView>
  );
}

function RequirementItem({ icon, text }: { icon: string; text: string }) {
  const theme = useTheme();
  
  return (
    <View style={styles.requirementRow}>
      <Icon name={icon} size={20} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={styles.requirementText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 200,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 60,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featuresCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  requirementsList: {
    marginBottom: spacing.xl,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requirementText: {
    marginLeft: spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  secondaryButton: {
    marginBottom: spacing.xs,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});

export default WelcomeScreen;
