import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore } from '../../store/onboardingStore';

type DocumentSide = 'front' | 'back';

export function DocumentCaptureScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const cameraRef = useRef<any>(null);

  const {
    isLoading,
    error,
    documentInfo,
    getDocumentUploadUrl,
    confirmDocumentUpload,
    setError,
  } = useOnboardingStore();

  const [documentType, setDocumentType] = useState<'NIDA_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE'>('NIDA_CARD');
  const [currentSide, setCurrentSide] = useState<DocumentSide>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontKey, setFrontKey] = useState<string | null>(null);
  const [backKey, setBackKey] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const needsBackImage = documentType === 'NIDA_CARD' || documentType === 'DRIVERS_LICENSE';

  const handleCapture = useCallback(async () => {
    try {
      if (!cameraRef.current) return;

      const photo = await cameraRef.current.capture();
      const imageUri = photo.uri;

      if (currentSide === 'front') {
        setFrontImage(imageUri);
      } else {
        setBackImage(imageUri);
      }

      setShowCamera(false);

      // Upload the captured image
      await uploadImage(imageUri, currentSide);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture image');
    }
  }, [currentSide]);

  const uploadImage = async (uri: string, side: DocumentSide) => {
    setIsUploading(true);
    try {
      // Get presigned upload URL
      const urlResult = await getDocumentUploadUrl(side);
      if (!urlResult.success || !urlResult.uploadUrl || !urlResult.key) {
        throw new Error(urlResult.error || 'Failed to get upload URL');
      }

      // Upload image to S3
      const response = await fetch(uri);
      const blob = await response.blob();

      await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      // Store the key
      if (side === 'front') {
        setFrontKey(urlResult.key);
      } else {
        setBackKey(urlResult.key);
      }

      setIsUploading(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleConfirmDocuments = async () => {
    if (!frontKey) {
      Alert.alert('Error', 'Please capture the front of your ID');
      return;
    }

    if (needsBackImage && !backKey) {
      Alert.alert('Error', 'Please capture the back of your ID');
      return;
    }

    const result = await confirmDocumentUpload(frontKey, backKey || undefined, documentType);
    if (result.success) {
      // Navigate to NIDA verification
      navigation.navigate('NidaVerification' as never);
    } else {
      Alert.alert('Error', result.error || 'Failed to confirm documents');
    }
  };

  const handleRetake = (side: DocumentSide) => {
    if (side === 'front') {
      setFrontImage(null);
      setFrontKey(null);
    } else {
      setBackImage(null);
      setBackKey(null);
    }
  };

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        cameraType={CameraType.Back}
        flashMode="auto"
      />
      <View style={styles.cameraOverlay}>
        <View style={styles.documentFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text variant="bodyLarge" style={styles.cameraHint}>
          Align your {documentType === 'NIDA_CARD' ? 'ID card' : 'document'} within the frame
        </Text>
      </View>
      <View style={styles.cameraControls}>
        <IconButton
          icon="close"
          mode="contained"
          size={24}
          onPress={() => setShowCamera(false)}
        />
        <IconButton
          icon="camera"
          mode="contained"
          size={40}
          onPress={handleCapture}
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
        />
        <IconButton
          icon="flash-auto"
          mode="contained"
          size={24}
          onPress={() => {}}
        />
      </View>
    </View>
  );

  const renderDocumentCard = (side: DocumentSide, image: string | null, key: string | null) => {
    const label = side === 'front' ? 'Front of ID' : 'Back of ID';
    const icon = side === 'front' ? 'card-account-details' : 'card-account-details-outline';

    return (
      <Surface style={styles.documentCard} elevation={1}>
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
            {isUploading && currentSide === side ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ color: 'white', marginTop: 8 }}>
                  Uploading...
                </Text>
              </View>
            ) : key ? (
              <View style={styles.successBadge}>
                <IconButton icon="check-circle" iconColor={theme.colors.primary} size={24} />
              </View>
            ) : null}
            <Button
              mode="text"
              onPress={() => handleRetake(side)}
              style={styles.retakeButton}
            >
              Retake
            </Button>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <IconButton icon={icon} size={48} iconColor={theme.colors.outline} />
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {label}
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                setCurrentSide(side);
                setShowCamera(true);
              }}
              style={{ marginTop: spacing.md }}
            >
              Capture
            </Button>
          </View>
        )}
      </Surface>
    );
  };

  if (showCamera) {
    return renderCamera();
  }

  const canProceed = frontKey && (!needsBackImage || backKey);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={3} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Verify Your Identity
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Take clear photos of your identification document
        </Text>

        {/* Document Type Selection */}
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
          Document Type
        </Text>
        <SegmentedButtons
          value={documentType}
          onValueChange={(value) => {
            setDocumentType(value as any);
            // Reset captures when changing type
            setFrontImage(null);
            setBackImage(null);
            setFrontKey(null);
            setBackKey(null);
          }}
          buttons={[
            { value: 'NIDA_CARD', label: 'NIDA Card' },
            { value: 'PASSPORT', label: 'Passport' },
            { value: 'DRIVERS_LICENSE', label: 'License' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Document Captures */}
        <View style={styles.documentsContainer}>
          {renderDocumentCard('front', frontImage, frontKey)}
          {needsBackImage && renderDocumentCard('back', backImage, backKey)}
        </View>

        {/* Tips */}
        <Surface style={[styles.tipsCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, marginBottom: 8 }}>
            Tips for clear photos
          </Text>
          <View style={styles.tipRow}>
            <IconButton icon="white-balance-sunny" size={20} iconColor={theme.colors.onPrimaryContainer} />
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
              Ensure good lighting, avoid shadows
            </Text>
          </View>
          <View style={styles.tipRow}>
            <IconButton icon="fit-to-page" size={20} iconColor={theme.colors.onPrimaryContainer} />
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
              Keep document flat and fully visible
            </Text>
          </View>
          <View style={styles.tipRow}>
            <IconButton icon="blur-off" size={20} iconColor={theme.colors.onPrimaryContainer} />
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
              Hold steady to avoid blur
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
          onPress={handleConfirmDocuments}
          loading={isLoading}
          disabled={!canProceed || isLoading || isUploading}
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
  sectionLabel: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: spacing.lg,
  },
  documentsContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  documentCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 180,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  previewContainer: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 200,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 20,
  },
  retakeButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  tipsCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -4,
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing.md,
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
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentFrame: {
    width: '85%',
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  cameraHint: {
    color: 'white',
    marginTop: spacing.lg,
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
});

export default DocumentCaptureScreen;
