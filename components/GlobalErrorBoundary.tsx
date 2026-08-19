import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Clipboard, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { logError, getLogs, clearLogs } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showLogs: boolean;
  logs: any[];
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showLogs: false,
    logs: [],
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showLogs: false, logs: [] };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    SplashScreen.hideAsync().catch(() => {});
    logError(error, errorInfo.componentStack || undefined);
  }

  private handleCopyError = () => {
    if (this.state.error) {
      const errorText = `Message: ${this.state.error.message}\n\nStack: ${this.state.error.stack}`;
      Clipboard.setString(errorText);
      alert('Error copiado al portapapeles');
    }
  };

  private handleShowLogs = async () => {
    const logs = await getLogs();
    this.setState({ showLogs: true, logs });
  };

  private handleClearLogs = async () => {
    await clearLogs();
    this.setState({ logs: [] });
    alert('Logs borrados');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.title}>¡Ups! Algo salió mal</Text>
            <Text style={styles.subtitle}>La aplicación ha encontrado un error crítico.</Text>
          </View>

          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {this.state.error?.message}
            </Text>
            <Text style={styles.stackText}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.copyButton} onPress={this.handleCopyError}>
              <MaterialCommunityIcons name="content-copy" size={20} color="white" />
              <Text style={styles.buttonText}>Copiar Error</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logsButton} onPress={this.handleShowLogs}>
              <MaterialCommunityIcons name="history" size={20} color="#3b82f6" />
              <Text style={styles.logsButtonText}>Ver Historial de Errores</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={this.state.showLogs} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Historial de Errores (DB)</Text>
                <TouchableOpacity onPress={() => this.setState({ showLogs: false })}>
                  <MaterialCommunityIcons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {this.state.logs.length === 0 ? (
                  <Text style={styles.noLogsText}>No hay errores registrados.</Text>
                ) : (
                  this.state.logs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <Text style={styles.logTimestamp}>{new Date(log.timestamp).toLocaleString()}</Text>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      <Text style={styles.logStack} numberOfLines={3}>{log.stack}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={this.handleClearLogs}>
                  <Text style={styles.clearButtonText}>Borrar Historial</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 0.5,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 12,
    color: '#b91c1c',
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 24,
    gap: 12,
  },
  copyButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logsButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  logsButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  noLogsText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 40,
  },
  logItem: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  logStack: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

