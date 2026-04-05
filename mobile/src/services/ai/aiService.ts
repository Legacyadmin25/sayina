import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const SUMMARY_CACHE_KEY = 'document_summaries';
const CHAT_HISTORY_KEY = 'ai_chat_history';

/**
 * Service for AI-powered features
 */
class AIService {
  /**
   * Get a summary of a document
   * @param documentId The ID of the document to summarize
   * @param forceRefresh Whether to force a refresh from the API (ignore cache)
   * @param language Optional language code for the summary (e.g., 'en', 'fr', 'es')
   */
  async getDocumentSummary(documentId: string, forceRefresh = false, language = 'en'): Promise<DocumentSummary> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedSummary = await this.getCachedSummary(documentId, language);
        if (cachedSummary) {
          return cachedSummary;
        }
      }

      // Call the API for a summary
      const response = await api.get(`/api/v1/ai/summarize`, {
        params: {
          document_id: documentId,
          language,
        },
      });

      const summary = response.data.data;

      // Cache the summary
      await this.cacheSummary(documentId, summary, language);

      return summary;
    } catch (error) {
      console.error('Error getting document summary:', error);
      throw error;
    }
  }

  /**
   * Get the cached summary for a document
   */
  private async getCachedSummary(documentId: string, language: string): Promise<DocumentSummary | null> {
    try {
      const cachedSummariesJson = await AsyncStorage.getItem(SUMMARY_CACHE_KEY);
      if (!cachedSummariesJson) {
        return null;
      }

      const cachedSummaries = JSON.parse(cachedSummariesJson);
      const key = `${documentId}_${language}`;
      
      if (cachedSummaries[key] && !this.isCacheExpired(cachedSummaries[key].timestamp)) {
        return cachedSummaries[key].summary;
      }

      return null;
    } catch (error) {
      console.error('Error getting cached summary:', error);
      return null;
    }
  }

  /**
   * Cache a document summary
   */
  private async cacheSummary(documentId: string, summary: DocumentSummary, language: string): Promise<void> {
    try {
      const cachedSummariesJson = await AsyncStorage.getItem(SUMMARY_CACHE_KEY);
      const cachedSummaries = cachedSummariesJson ? JSON.parse(cachedSummariesJson) : {};
      
      const key = `${documentId}_${language}`;
      
      cachedSummaries[key] = {
        summary,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cachedSummaries));
    } catch (error) {
      console.error('Error caching summary:', error);
    }
  }

  /**
   * Check if cache is expired (24 hours)
   */
  private isCacheExpired(timestamp: number): boolean {
    const cacheLifetime = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - timestamp > cacheLifetime;
  }

  /**
   * Send a message to the AI assistant
   * @param message The user's message
   * @param contextType The context type (e.g., 'general', 'document', 'envelope')
   * @param contextId Optional context ID (e.g., document ID or envelope ID)
   */
  async sendChatMessage(message: string, contextType: ChatContextType, contextId?: string): Promise<ChatMessage> {
    try {
      const response = await api.post('/api/v1/ai/chat', {
        message,
        context_type: contextType,
        context_id: contextId,
      });

      const chatMessage = response.data.data;

      // Store in chat history
      await this.addToChatHistory(contextType, contextId || 'general', {
        id: chatMessage.id,
        text: message,
        sender: 'user',
        timestamp: Date.now(),
      });

      await this.addToChatHistory(contextType, contextId || 'general', {
        id: chatMessage.response_id,
        text: chatMessage.response,
        sender: 'assistant',
        timestamp: Date.now(),
      });

      return chatMessage;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a specific context
   * @param contextType The context type
   * @param contextId The context ID
   */
  async getChatHistory(contextType: ChatContextType, contextId: string): Promise<ChatMessageHistory[]> {
    try {
      const chatHistoryJson = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (!chatHistoryJson) {
        return [];
      }

      const chatHistory = JSON.parse(chatHistoryJson);
      const key = `${contextType}_${contextId}`;
      
      return chatHistory[key] || [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  /**
   * Add a message to chat history
   */
  private async addToChatHistory(contextType: ChatContextType, contextId: string, message: ChatMessageHistory): Promise<void> {
    try {
      const chatHistoryJson = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      const chatHistory = chatHistoryJson ? JSON.parse(chatHistoryJson) : {};
      
      const key = `${contextType}_${contextId}`;
      
      if (!chatHistory[key]) {
        chatHistory[key] = [];
      }

      // Limit history to 50 messages per context
      if (chatHistory[key].length >= 50) {
        chatHistory[key].shift();
      }

      chatHistory[key].push(message);
      
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error adding to chat history:', error);
    }
  }

  /**
   * Clear chat history for a specific context
   */
  async clearChatHistory(contextType: ChatContextType, contextId: string): Promise<void> {
    try {
      const chatHistoryJson = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (!chatHistoryJson) {
        return;
      }

      const chatHistory = JSON.parse(chatHistoryJson);
      const key = `${contextType}_${contextId}`;
      
      if (chatHistory[key]) {
        delete chatHistory[key];
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }

  /**
   * Extract document fields using AI
   * @param documentId The document ID to analyze
   */
  async extractDocumentFields(documentId: string): Promise<ExtractedField[]> {
    try {
      const response = await api.post(`/api/v1/ai/extract-fields`, {
        document_id: documentId,
      });

      return response.data.data.fields;
    } catch (error) {
      console.error('Error extracting document fields:', error);
      throw error;
    }
  }

  /**
   * Get AI-generated suggestions for document field placement
   * @param documentId The document ID
   */
  async getFieldSuggestions(documentId: string): Promise<FieldSuggestion[]> {
    try {
      const response = await api.get(`/api/v1/ai/field-suggestions`, {
        params: {
          document_id: documentId,
        },
      });

      return response.data.data.suggestions;
    } catch (error) {
      console.error('Error getting field suggestions:', error);
      throw error;
    }
  }
}

// Types
export interface DocumentSummary {
  title: string;
  summary: string;
  key_points: string[];
  participants: string[];
  dates: string[];
  financial_terms?: string[];
  legal_terms?: string[];
  word_count: number;
  page_count: number;
  language: string;
  confidence_score: number;
}

export type ChatContextType = 'general' | 'document' | 'envelope' | 'signing';

export interface ChatMessage {
  id: string;
  response: string;
  response_id: string;
  suggestions?: string[];
}

export interface ChatMessageHistory {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: number;
}

export interface ExtractedField {
  type: string;
  name: string;
  value: string;
  confidence: number;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
}

export interface FieldSuggestion {
  field_type: string;
  field_name: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  confidence: number;
}

export default new AIService();
