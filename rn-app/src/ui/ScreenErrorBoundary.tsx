import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type Props = {
  name: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = {hasError: false, errorMessage: ''};

  static getDerivedStateFromError(error: unknown): State {
    return {hasError: true, errorMessage: error instanceof Error ? error.message : 'Unknown error'};
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Failed to Load</Text>
        <Text style={styles.subtitle}>{`${this.props.name} failed to load. Retry?`}</Text>
        <Pressable style={styles.button} onPress={() => this.setState({hasError: false, errorMessage: ''})}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#060606'},
  title: {color: '#FFFFFF', fontWeight: '800', fontSize: 22},
  subtitle: {color: '#BFBFBF', marginTop: 8, textAlign: 'center'},
  button: {marginTop: 14, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#BD00FF'},
  buttonText: {color: '#FFFFFF', fontWeight: '800'},
});
