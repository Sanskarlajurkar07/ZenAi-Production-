// src/services/ai.service.js
const ProductManagerAgent = require('../../../zenai-ai-engine/src/agents/product-manager.agent');
const TaskAnalyzerAgent = require('../../../zenai-ai-engine/src/agents/task-analyzer.agent');
const MeetingSummarizerAgent = require('../../../zenai-ai-engine/src/agents/meeting-summarizer.agent');
const WhisperService = require('../../../zenai-ai-engine/src/whisper/transcription.service');
const DocumentProcessor = require('../../../zenai-ai-engine/src/embeddings/document-processor');
const ChatMessage = require('../models/ChatMessage.model');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.productManager = null;
    this.taskAnalyzer = null;
    this.meetingSummarizer = null;
    this.whisperService = null;
    this.documentProcessor = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize all AI agents
      this.productManager = new ProductManagerAgent();
      await this.productManager.initialize();

      this.taskAnalyzer = new TaskAnalyzerAgent();
      await this.taskAnalyzer.initialize();

      this.meetingSummarizer = new MeetingSummarizerAgent();

      this.whisperService = new WhisperService();

      this.documentProcessor = new DocumentProcessor();
      await this.documentProcessor.initialize();

      this.initialized = true;
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('AI Service initialization failed:', error);
      throw error;
    }
  }

  async chat(userId, message, context = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const startTime = Date.now();

      // Choose appropriate agent based on context
      let response;
      if (context.type === 'task-analysis') {
        response = await this.taskAnalyzer.run(message, context);
      } else if (context.type === 'project-management') {
        response = await this.productManager.run(message, context);
      } else {
        // Default to product manager for general queries
        response = await this.productManager.chat(message);
      }

      const responseTime = Date.now() - startTime;

      // Save conversation to database
      await ChatMessage.create({
        user: userId,
        role: 'user',
        content: message,
        context: {
          projectId: context.projectId,
          taskId: context.taskId
        }
      });

      await ChatMessage.create({
        user: userId,
        role: 'ai',
        content: response,
        context: {
          projectId: context.projectId,
          taskId: context.taskId
        },
        metadata: {
          model: 'gpt-4',
          responseTime
        }
      });

      return {
        response,
        metadata: {
          responseTime,
          agent: context.type || 'product-manager'
        }
      };
    } catch (error) {
      logger.error('AI Chat error:', error);
      throw error;
    }
  }

  async createTaskFromDescription(description, projectId, userId) {
    if (!this.initialized) await this.initialize();

    try {
      const taskData = await this.productManager.createTaskFromDescription(
        description,
        projectId
      );

      return {
        success: true,
        task: taskData
      };
    } catch (error) {
      logger.error('Task creation error:', error);
      throw error;
    }
  }

  async analyzeTask(task, projectContext) {
    if (!this.initialized) await this.initialize();

    try {
      const analysis = await this.taskAnalyzer.analyzeTask(task, projectContext);
      return analysis;
    } catch (error) {
      logger.error('Task analysis error:', error);
      throw error;
    }
  }

  async analyzeProject(projectData, tasks) {
    if (!this.initialized) await this.initialize();

    try {
      const health = await this.productManager.analyzeProjectHealth(
        projectData,
        tasks
      );
      return health;
    } catch (error) {
      logger.error('Project analysis error:', error);
      throw error;
    }
  }

  async transcribeAudio(audioFilePath, meetingContext) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.meetingSummarizer.transcribeAndSummarize(
        audioFilePath,
        meetingContext
      );
      return result;
    } catch (error) {
      logger.error('Transcription error:', error);
      throw error;
    }
  }

  async indexDocument(content, metadata) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.documentProcessor.indexDocument(
        content,
        metadata
      );
      return result;
    } catch (error) {
      logger.error('Document indexing error:', error);
      throw error;
    }
  }

  async searchDocuments(query, options) {
    if (!this.initialized) await this.initialize();

    try {
      const results = await this.documentProcessor.similaritySearch(
        query,
        options
      );
      return results;
    } catch (error) {
      logger.error('Document search error:', error);
      throw error;
    }
  }

  async suggestTaskBreakdown(epicTask) {
    if (!this.initialized) await this.initialize();

    try {
      const subtasks = await this.productManager.suggestTaskBreakdown(epicTask);
      return subtasks;
    } catch (error) {
      logger.error('Task breakdown error:', error);
      throw error;
    }
  }

  async estimateEffort(tasks) {
    if (!this.initialized) await this.initialize();

    try {
      const estimates = await this.taskAnalyzer.estimateEffort(tasks);
      return estimates;
    } catch (error) {
      logger.error('Effort estimation error:', error);
      throw error;
    }
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;