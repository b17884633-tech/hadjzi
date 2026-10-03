import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../../navigation/types';

type Route = RouteProp<RootStackParamList, 'PaymentWebview'>;

export function PaymentWebviewScreen() {
  const { checkoutUrl, bookingId } = useRoute<Route>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={(event) => {
          if (event.url.includes('payment/success')) {
            navigation.replace('BookingVoucher', { bookingId });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
