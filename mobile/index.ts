import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';
import App from './App';

/** Flex RTL (rows start on the right). Text alignment is handled in AppText. */
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

registerRootComponent(App);
