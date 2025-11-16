// zenai-backend/src/services/ai.service.js
// RECOMMENDED APPROACH - HTTP-based communication
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const ChatMessage = require('../models/ChatMessage.model');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8001';
    this.client = axios.create({
      baseURL: this.aiEngineUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Check if AI engine is available
    this.checkConnection();
  }

  async checkConnection() {
    try {
      await this.client.get('/health');
      logger.info('✓ AI Engine connection established');
    } catch (error) {
      logger.warn('⚠ AI Engine not available - running in fallback mode');
    }
  }

  async chat(userId, message, context = {}) {
    try {
      const startTime = Date.now();

      const response = await this.client.post('/api/v1/ai/chat', {
        message,
        context
      });

      const responseTime = Date.now() - startTime;

      // Save user message
      await ChatMessage.create({
        user: userId,
        role: 'user',
        content: message,
        context: {
          projectId: context.projectId,
          taskId: context.taskId
        }
      });

      // Save AI response
      await ChatMessage.create({
        user: userId,
        role: 'ai',
        content: response.data.data.response,
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
        response: response.data.data.response,
        metadata: {
          responseTime,
          agent: context.type || 'product-manager'
        }
      };
    } catch (error) {
      logger.error('AI Chat error:', error.message);
      
      // Fallback response
      return {
        response: "I'm currently experiencing connectivity issues. Please try again later.",
        metadata: {
          error: true,
          fallback: true
        }
      };
    }
  }

  async createTaskFromDescription(description, projectId, userId) {
    try {
      const response = await this.client.post('/api/v1/ai/create-task', {
        description,
        projectId
      });

      return {
        success: true,
        task: response.data.data.task || response.data.data
      };
    } catch (error) {
      logger.error('Task creation error:', error.message);
      
      // Fallback: Create basic task structure
      return {
        success: true,
        task: {
          title: description.substring(0, 100),
          description: description,
          priority: 'medium',
          estimatedTime: 4,
          tags: ['pending-ai-analysis'],
          status: 'todo'
        }
      };
    }
  }

  async analyzeTask(task, projectContext) {
    try {
      const response = await this.client.post('/api/v1/ai/analyze-task', {
        task: {
          _id: task._id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status
        },
        projectContext
      });

      return response.data.data.analysis || response.data.data;
    } catch (error) {
      logger.error('Task analysis error:', error.message);
      
      // Fallback analysis
      return {
        complexityScore: 5,
        estimatedHours: 8,
        skillsRequired: ['General'],
        dependencies: [],
        risks: ['Unable to perform AI analysis'],
        recommendations: ['Manual review recommended'],
        blockers: []
      };
    }
  }

  async analyzeProject(projectData, tasks) {
    try {
      const response = await this.client.post('/api/v1/ai/analyze-project', {
        projectData: {
          name: projectData.name,
          status: projectData.status,
          progress: projectData.progress,
          deadline: projectData.deadline
        },
        tasks: tasks.map(t => ({
          _id: t._id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate
        }))
      });

      return response.data.data.health || response.data.data;
    } catch (error) {
      logger.error('Project analysis error:', error.message);
      
      // Fallback analysis
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      
      return {
        healthScore: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        status: 'unknown',
        insights: ['AI analysis unavailable'],
        risks: [],
        recommendations: ['Manual project review recommended']
      };
    }
  }

  async transcribeAudio(audioFilePath, meetingContext) {
    try {
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioFilePath));
      formData.append('title', meetingContext.title || '');
      formData.append('participants', JSON.stringify(meetingContext.participants || []));
      formData.append('date', meetingContext.date || new Date().toISOString());

      const response = await this.client.post('/api/v1/ai/transcribe', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data.data;
    } catch (error) {
      logger.error('Transcription error:', error.message);
      throw new Error('Audio transcription service unavailable');
    }
  }

  async indexDocument(content, metadata) {
    try {
      const response = await this.client.post('/api/v1/ai/index-document', {
        content,
        metadata
      });

      return response.data.data;
    } catch (error) {
      logger.error('Document indexing error:', error.message);
      return { 
        success: false, 
        message: 'Document indexing unavailable' 
      };
    }
  }

  async searchDocuments(query, options) {
    try {
      const response = await this.client.get('/api/v1/ai/search-documents', {
        params: { 
          query, 
          limit: options.limit || 5,
          filter: JSON.stringify(options.filter || {})
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error('Document search error:', error.message);
      return { results: [] };
    }
  }

  async suggestTaskBreakdown(epicTask) {
    try {
      const response = await this.client.post('/api/v1/ai/suggest-breakdown', {
        task: {
          title: epicTask.title,
          description: epicTask.description
        }
      });

      return response.data.data.subtasks || response.data.data;
    } catch (error) {
      logger.error('Task breakdown error:', error.message);
      
      // Simple fallback breakdown
      return [
        {
          title: `${epicTask.title} - Phase 1`,
          description: 'Initial implementation',
          estimatedTime: 4,
          priority: 'high'
        },
        {
          title: `${epicTask.title} - Phase 2`,
          description: 'Testing and refinement',
          estimatedTime: 3,
          priority: 'medium'
        }
      ];
    }
  }

  async estimateEffort(tasks) {
    try {
      const response = await this.client.post('/api/v1/ai/estimate-effort', {
        tasks: tasks.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority
        }))
      });

      return response.data.data.estimates || response.data.data;
    } catch (error) {
      logger.error('Effort estimation error:', error.message);
      
      // Simple fallback estimation
      return {
        totalHours: tasks.length * 8,
        taskEstimates: tasks.map(t => ({
          taskId: t._id,
          hours: 8,
          confidence: 'low'
        }))
      };
    }
  }

  // Health check method
  async isAvailable() {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;