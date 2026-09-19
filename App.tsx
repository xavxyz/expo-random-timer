import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from './src/sessionClock';
import { useSession } from './src/useSession';

export default function App() {
  const { snapshot, start, stop } = useSession();

  return (
    <View style={styles.container}>
      {snapshot ? (
        <>
          <Text>Round {snapshot.round}</Text>
          <Text>{formatElapsed(snapshot.elapsedMs)}</Text>
          <Button title="Stop" onPress={stop} />
        </>
      ) : (
        <Button title="Start" onPress={start} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
