import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Insights
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.leadText}>
        A quick summary of what this app gives you right now.
      </ThemedText>

      <Collapsible title="Features available">
        <ThemedText>
          Secure signup/login, cloud-backed expenses, category breakdown chart, and responsive tab
          navigation.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Platform behavior">
        <ThemedText>
          Works on Android, iOS, and web. If you run on a real phone, use your computer LAN IP in
          the API URL.
        </ThemedText>
      </Collapsible>

      <Collapsible title="UI foundation">
        <ThemedText>
          The project uses Expo Router with reusable themed components and collapsible sections for
          simple UI scaling.
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={styles.logo}
        />
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Next recommended steps">
        <ThemedText>Persist auth token for auto-login and add monthly budget limits.</ThemedText>
      </Collapsible>

      <Collapsible title="Theme support">
        <ThemedText>
          Light and dark styles are handled through shared theme tokens.
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.codeText}>
          useColorScheme()
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  leadText: {
    opacity: 0.85,
    marginBottom: 8,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  codeText: {
    fontFamily: Fonts.mono,
  },
});
