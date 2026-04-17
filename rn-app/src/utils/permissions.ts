import {Alert, Linking, Platform} from 'react-native';
import {Audio} from 'expo-av';

type PermissionRequestOptions = {
  deniedTitle: string;
  deniedMessage: string;
  blockedTitle: string;
  blockedMessage: string;
};

const defaultMicPermissionCopy: PermissionRequestOptions = {
  deniedTitle: 'Microphone required',
  deniedMessage: 'Microphone access is required for this feature.',
  blockedTitle: 'Microphone blocked',
  blockedMessage: 'Enable microphone access in your phone settings.',
};

export const ensureMicrophonePermission = async (
  copy: Partial<PermissionRequestOptions> = {},
): Promise<boolean> => {
  if (Platform.OS === 'web') return true;
  const messages = {...defaultMicPermissionCopy, ...copy};
  try {
    const current = await Audio.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Audio.requestPermissionsAsync();
    if (requested.granted) return true;

    if (!requested.canAskAgain) {
      Alert.alert(messages.blockedTitle, messages.blockedMessage, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open Settings', onPress: () => void Linking.openSettings()},
      ]);
      return false;
    }

    Alert.alert(messages.deniedTitle, messages.deniedMessage);
    return false;
  } catch {
    Alert.alert('Permission error', 'Unable to request microphone permission right now.');
    return false;
  }
};
