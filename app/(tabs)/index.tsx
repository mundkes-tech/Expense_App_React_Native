import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Expense Manager</ThemedText>
        <ThemedText style={styles.subtitle}>
          Track spending, stay organized, and review your progress.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.statsRow}>
        <ThemedView style={styles.statCard}>
          <ThemedText type="defaultSemiBold">Total Expenses</ThemedText>
          <ThemedText style={styles.statValue}>Live</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <ThemedText type="defaultSemiBold">Account</ThemedText>
          <ThemedText style={styles.statValue}>Secure</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick Actions</ThemedText>
        <Link href="/(tabs)/expenses" style={styles.actionLink}>
          <ThemedText type="link">Go to Expenses</ThemedText>
        </Link>
        <Link href="/(tabs)/explore" style={styles.actionLink}>
          <ThemedText type="link">Open Explore</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">How to use</ThemedText>
        <ThemedText>
          Create your account on the Expenses tab, add your daily transactions, and use the chart
          to monitor spending by category.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    marginBottom: 6,
    gap: 8,
  },
  subtitle: {
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(161, 206, 220, 0.22)',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    gap: 8,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(125, 125, 125, 0.12)',
  },
  actionLink: {
    paddingVertical: 2,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
