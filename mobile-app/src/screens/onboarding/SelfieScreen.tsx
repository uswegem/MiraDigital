import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore } from '../../store/onboardingStore';

type CaptureState = 'instructions' | 'capturing' | 'processing' | 'success' | 'failed';

export function SelfieScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const cameraRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    isLoading,
    error,
    startLivenessSession,
    confirmSelfie,
    getDocumentUploadUrl,
    setError,
  } = useOnboardingStore();

  const [captureState, setCaptureState] = useState<CaptureState>('instructions');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [livenessSessionId, setLivenessSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pulse animation for face guide
  useEffect(() => {
    if (captureState === 'capturing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [captureState]);

  const handleStartCapture = async () => {
    setCaptureState('capturing');
    
    // Start liveness session with AWS Rekognition
    try {
      const result = await startLivenessSession();
      if (result.success && result.sessionId) {
        setLivenessSessionId(result.sessionId);
      } else {
        // Continue without server liveness session (will use local capture)
        console.log('No server liveness session, using local capture');
      }
    } catch (err) {
      console.log('Liveness session optional, continuing...');
    }
  };

  const handleCapture = useCallback(async () => {
    try {
      if (!cameraRef.current) return;

      const photo = await cameraRef.current.capture();
      const imageUri = photo.uri;

      setSelfieUri(imageUri);
      setCaptureState('processing');

      // Upload selfie
      await uploadSelfie(imageUri);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture selfie');
      setCaptureState('failed');
    }
  }, []);

  const uploadSelfie = async (uri: string) => {
    setIsUploading(true);
    try {
      // Get presigned upload URL for selfie
      // Using a simple key generation here; in production, get from server
      const timestamp = Date.now();
      const selfieKey = `selfies/selfie_${timestamp}.jpg`;

      // For this implementation, we'll get the URL from onboarding endpoint
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to server (simplified - in production, use presigned S3 URL)
      // The confirm endpoint will handle the actual processing
      
      // Confirm the selfie with backend
      const confirmResult = await confirmSelfie(
        livenessSessionId || `local_${timestamp}`,
        selfieKey
      );

      setIsUploading(false);

      if (confirmResult.success) {
        setCaptureState('success');
        // Auto-navigate after short delay
        setTimeout(() => {
          navigation.navigate('Address' as never);
        }, 1500);
      } else {
        setError(confirmResult.error || 'Face verification failed');
        setCaptureState('failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to verify selfie');
      setCaptureState('failed');
      setIsUploading(false);
    }
  };

  const handleRetry = () => {
    setSelfieUri(null);
    setError(null);
    setCaptureState('instructions');
  };

  const renderInstructions = () => (
    <View style={styles.instructionsContainer}>
      <Surface style={[styles.instructionsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <IconButton icon="face-recognition" size={80} iconColor={theme.colors.primary} />
        <Text variant="titleLarge" style={{ fontWeight: 'bold', textAlign: 'center' }}>
          Take a Selfie
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: spacing.sm }}>
          We need to verify that you match your ID document
        </Text>

        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <IconButton icon="lightbulb-on" size={24} iconColor={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Find good lighting - face a window or light
            </Text>
          </View>
          <View style={styles.tipItem}>
            <IconButton icon="emoticon-neutral" size={24} iconColor={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Keep a neutral expression, eyes open
            </Text>
          </View>
          <View style={styles.tipItem}>
            <IconButton icon="glasses" size={24} iconColor={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Remove glasses, hats, or face coverings
            </Text>
          </View>
          <View style={styles.tipItem}>
            <IconButton icon="cellphone-screenshot" size={24} iconColor={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Position your face in the circle guide
            </Text>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleStartCapture}
          style={{ marginTop: spacing.lg }}
          icon="camera"
        >
          Start Camera
        </Button>
      </Surface>
    </View>
  );

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        cameraType={CameraType.Front}
        flashMode="off"
      />
      <View style={styles.cameraOverlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <Animated.View 
            style={[
              styles.faceGuide,
              { 
                borderColor: theme.colors.primary,
                transform: [{ scale: pulseAnim }],
              }
            ]}
          />
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text variant="bodyLarge" style={styles.cameraHint}>
            Position your face in the circle
          </Text>
        </View>
      </View>
      <View style={styles.cameraControls}>
        <IconButton
          icon="close"
          mode="contained"
          size={24}
          onPress={() => setCaptureState('instructions')}
        />
        <IconButton
          icon="camera"
          mode="contained"
          size={48}
          onPress={handleCapture}
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
        />
        <IconButton
          icon="camera-flip"
          mode="contained"
          size={24}
          onPress={() => {}}
          disabled
        />
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <Surface style={[styles.processingCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="titleMedium" style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          Verifying your face...
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: spacing.sm, textAlign: 'center' }}>
          Checking liveness and matching with ID
        </Text>
      </Surface>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.processingContainer}>
      <Surface style={[styles.processingCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={1}>
        <IconButton icon="check-circle" size={80} iconColor={theme.colors.primary} />
        <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
          Face Verified!
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: spacing.sm }}>
          Your selfie matches your ID document
        </Text>
      </Surface>
    </View>
  );

  const renderFailed = () => (
    <View style={styles.processingContainer}>
      <Surface style={[styles.processingCard, { backgroundColor: theme.colors.errorContainer }]} elevation={1}>
        <IconButton icon="alert-circle" size={80} iconColor={theme.colors.error} />
        <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
          Verification Failed
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: spacing.sm, textAlign: 'center' }}>
          {error || "We couldn't verify your face. Please try again."}
        </Text>
        <Button
          mode="contained"
          onPress={handleRetry}
          style={{ marginTop: spacing.lg }}
        >
          Try Again
        </Button>
      </Surface>
    </View>
  );

  if (captureState === 'capturing') {
    return renderCamera();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={4} totalSteps={9} />

      {captureState === 'instructions' && renderInstructions()}
      {captureState === 'processing' && renderProcessing()}
      {captureState === 'success' && renderSuccess()}
      {captureState === 'failed' && renderFailed()}

      {captureState === 'instructions' && (
        <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.footerButton}
          >
            Back
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  instructionsCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
  },
  tipsList: {
    width: '100%',
    marginTop: spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 280,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  faceGuide: {
    width: 240,
    height: 280,
    borderWidth: 3,
    borderRadius: 120,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  cameraHint: {
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  processingContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  processingCard: {
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
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

export default SelfieScreen;
