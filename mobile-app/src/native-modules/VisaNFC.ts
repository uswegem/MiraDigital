import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

/**
 * VISA NFC Bridge
 * Handles native NFC communication for tap-to-pay functionality
 */
class VisaNFCBridge {
  private static instance: VisaNFCBridge;
  private isSupported: boolean = false;
  private isEnabled: boolean = false;
  private eventEmitter: NativeEventEmitter | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): VisaNFCBridge {
    if (!VisaNFCBridge.instance) {
      VisaNFCBridge.instance = new VisaNFCBridge();
    }
    return VisaNFCBridge.instance;
  }

  private async initialize() {
    try {
      this.isSupported = await NfcManager.isSupported();
      if (this.isSupported) {
        await NfcManager.start();
        this.isEnabled = await NfcManager.isEnabled();
      }
    } catch (error) {
      console.error('NFC initialization failed:', error);
      this.isSupported = false;
    }
  }

  /**
   * Check if device supports NFC
   */
  async checkNFCSupport(): Promise<{
    supported: boolean;
    enabled: boolean;
    platform: string;
  }> {
    const supported = await NfcManager.isSupported();
    const enabled = supported ? await NfcManager.isEnabled() : false;

    return {
      supported,
      enabled,
      platform: Platform.OS,
    };
  }

  /**
   * Request user to enable NFC
   */
  async requestEnableNFC(): Promise<void> {
    if (Platform.OS === 'android') {
      await NfcManager.goToNfcSetting();
    } else {
      // iOS doesn't have a direct way to open NFC settings
      throw new Error('Please enable NFC in Settings');
    }
  }

  /**
   * Start listening for NFC tap
   */
  async startPaymentSession(paymentData: {
    token: string;
    cryptogram: string;
    amount: number;
    merchantName: string;
  }): Promise<{ success: boolean; transactionResult?: any }> {
    if (!this.isSupported || !this.isEnabled) {
      throw new Error('NFC is not available');
    }

    try {
      // Request NFC technology
      await NfcManager.requestTechnology([NfcTech.IsoDep]);

      // For actual VISA payment, you would use the VISA SDK's native module
      // This is a simplified flow for demonstration

      // Send payment command to terminal
      // In real implementation, this would be handled by VISA's native SDK
      const command = this.buildPaymentCommand(paymentData);
      
      // Simulate response from terminal
      // Real implementation would read response from NFC
      const response = await this.simulateTerminalResponse(command);

      return {
        success: response.statusCode === '00',
        transactionResult: {
          authorizationCode: response.authCode,
          responseCode: response.statusCode,
          amount: paymentData.amount,
          merchantName: paymentData.merchantName,
        },
      };
    } catch (error) {
      console.error('NFC payment failed:', error);
      throw error;
    } finally {
      await this.stopSession();
    }
  }

  /**
   * Stop NFC session
   */
  async stopSession(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Build APDU command for payment (simplified)
   */
  private buildPaymentCommand(paymentData: {
    token: string;
    cryptogram: string;
    amount: number;
  }): Uint8Array {
    // In real implementation, this would build proper APDU commands
    // following EMV contactless specifications
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      token: paymentData.token,
      cryptogram: paymentData.cryptogram,
      amount: paymentData.amount,
    });
    return encoder.encode(data);
  }

  /**
   * Simulate terminal response (for development)
   */
  private async simulateTerminalResponse(command: Uint8Array): Promise<{
    statusCode: string;
    authCode: string;
  }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate successful response
    return {
      statusCode: '00',
      authCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  /**
   * Read NFC tag (for QR alternative)
   */
  async readTag(): Promise<string | null> {
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      const tag = await NfcManager.getTag();

      if (tag?.ndefMessage) {
        const records = tag.ndefMessage;
        for (const record of records) {
          if (record.payload) {
            const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
            return payload;
          }
        }
      }
      return null;
    } finally {
      await this.stopSession();
    }
  }

  /**
   * Write to NFC tag (for internal use)
   */
  async writeTag(text: string): Promise<boolean> {
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return true;
      }
      return false;
    } finally {
      await this.stopSession();
    }
  }
}

export const visaNFC = VisaNFCBridge.getInstance();
export default visaNFC;
