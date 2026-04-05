import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { Text, IconButton, useTheme, Divider, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'react-query';
import aiService, { ChatContextType, ChatMessageHistory } from '../../services/ai/aiService';

interface AIChatAssistantProps {
  contextType: ChatContextType;
  contextId?: string;
  visible: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  contextType,
  contextId = 'general',
  visible,
  onClose,
  initialPrompt,
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessageHistory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(1000)).current;

  // Fetch chat history
  const { data: chatHistory, refetch: refetchHistory } = useQuery(
    ['chatHistory', contextType, contextId],
    () => aiService.getChatHistory(contextType, contextId),
    {
      enabled: visible,
      onSuccess: (data) => {
        setMessages(data);
      },
    }
  );

  // Send message mutation
  const { mutate: sendMessage, isLoading: isSending } = useMutation(
    (text: string) => aiService.sendChatMessage(text, contextType, contextId),
    {
      onSuccess: (data) => {
        // Update suggestions
        setSuggestions(data.suggestions || []);
        
        // Refetch chat history
        refetchHistory();
      },
      onError: (error) => {
        console.error('Error sending message:', error);
        
        // Add error message
        const errorMsg: ChatMessageHistory = {
          id: `error-${Date.now()}`,
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'assistant',
          timestamp: Date.now(),
        };
        
        setMessages((prev) => [...prev, errorMsg]);
      },
    }
  );

  // Handle send message
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to local state immediately for better UX
    const userMsg: ChatMessageHistory = {
      id: `local-${Date.now()}`,
      text: message,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    
    // Send to server
    sendMessage(message);
    
    // Clear input
    setMessage('');
    
    // Dismiss keyboard
    Keyboard.dismiss();
  };

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // Handle clear chat
  const handleClearChat = async () => {
    await aiService.clearChatHistory(contextType, contextId);
    setMessages([]);
    setSuggestions([]);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle initial prompt
  useEffect(() => {
    if (visible && initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt);
    }
  }, [visible, initialPrompt]);

  // Animation for showing/hiding the chat
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="sparkles" size={24} color="#DAB44A" />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Sayina Assistant
          </Text>
        </View>
        <IconButton
          icon="close"
          size={24}
          onPress={onClose}
        />
      </View>
      
      <Divider />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              Ask me anything about the Sayina e-signature service!
            </Text>
            <View style={styles.suggestionContainer}>
              <TouchableOpacity
                style={styles.suggestionBubble}
                onPress={() => handleSuggestionTap('How do I create a new envelope?')}
              >
                <Text style={styles.suggestionText}>How do I create a new envelope?</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.suggestionBubble}
                onPress={() => handleSuggestionTap('What types of documents can I sign?')}
              >
                <Text style={styles.suggestionText}>What types of documents can I sign?</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.suggestionBubble}
                onPress={() => handleSuggestionTap('How do I add signers to a document?')}
              >
                <Text style={styles.suggestionText}>How do I add signers to a document?</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          messages.map((msg, index) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userBubble : styles.assistantBubble,
                index === 0 && styles.firstBubble,
                index === messages.length - 1 && styles.lastBubble,
              ]}
            >
              {msg.sender === 'assistant' && (
                <View style={styles.assistantIcon}>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                </View>
              )}
              
              <View
                style={[
                  styles.messageContent,
                  msg.sender === 'user' ? styles.userContent : styles.assistantContent,
                ]}
              >
                <Text style={msg.sender === 'user' ? styles.userText : styles.assistantText}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))
        )}
        
        {isSending && (
          <View style={[styles.messageBubble, styles.assistantBubble, styles.lastBubble]}>
            <View style={styles.assistantIcon}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={[styles.messageContent, styles.assistantContent]}>
              <View style={styles.typingContainer}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      {suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContainer}
        >
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionTap(suggestion)}
            >
              <Text style={styles.suggestionChipText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Ask a question..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          
          {messages.length > 0 && !message.trim() && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearChat}
            >
              <Ionicons name="trash-outline" size={20} color="#999999" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              !message.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? '#FFFFFF' : '#CCCCCC'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    maxHeight: '60%',
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    opacity: 0.9,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    marginTop: 16,
    marginBottom: 24,
  },
  suggestionContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  suggestionBubble: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '90%',
  },
  suggestionText: {
    color: '#333333',
    fontSize: 14,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  firstBubble: {
    marginTop: 8,
  },
  lastBubble: {
    marginBottom: 8,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DAB44A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '90%',
  },
  userContent: {
    backgroundColor: '#DAB44A',
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  assistantText: {
    color: '#333333',
    fontSize: 14,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    width: 48,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BBBBBB',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.6,
    transform: [{ scale: 0.8 }],
  },
  typingDot2: {
    opacity: 0.8,
    transform: [{ scale: 0.9 }],
  },
  typingDot3: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  suggestionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#555555',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DAB44A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});

export default AIChatAssistant;
